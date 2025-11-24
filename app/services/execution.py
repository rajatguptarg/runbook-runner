import asyncio
import docker
import httpx
import asyncssh
from loguru import logger
from typing import Dict, Any
from pydantic import BaseModel

from app.models import Runbook
from app.models.block import Block
from app.models.credential import Credential
from app.models.environment import ExecutionEnvironment
from app.models.execution import ExecutionJob, ExecutionStep
from app.models.runbook import RunbookVersion
from app.security import decrypt_secret


class BlockExecutionResult(BaseModel):
    status: str
    output: str
    exit_code: int


async def execute_api_block(block: Block) -> BlockExecutionResult:
    """
    Executes an API call block and returns the result without creating a database record.
    """
    config = block.config
    method = config.get("method", "GET")
    url = config.get("url")
    headers = config.get("headers", {})
    body = config.get("body")
    credential_id = config.get("credential_id")

    if not url:
        return BlockExecutionResult(
            status="error", output="API block has no URL configured.", exit_code=-1
        )

    if credential_id:
        cred = await Credential.get(credential_id)
        if cred and cred.type == "api":
            token = decrypt_secret(cred.encrypted_secret)
            header_name = config.get("auth_header_name") or "Authorization"
            headers[header_name] = token

    try:
        async with httpx.AsyncClient() as client:
            for attempt in range(3):  # Retry up to 3 times
                try:
                    response = await client.request(
                        method, url, headers=headers, json=body, timeout=10.0
                    )
                    output = (
                        f"Status: {response.status_code}\n"
                        f"Headers: {response.headers}\n"
                        f"Body: {response.text}"
                    )
                    exit_code = response.status_code
                    if 200 <= response.status_code < 300:
                        return BlockExecutionResult(
                            status="success", output=output, exit_code=exit_code
                        )
                    elif 500 <= response.status_code < 600:
                        logger.warning(
                            f"API call for block {block.id} failed with {response.status_code}. Retrying..."
                        )
                        await asyncio.sleep(1 * attempt)
                        continue
                    else:
                        return BlockExecutionResult(
                            status="error", output=output, exit_code=exit_code
                        )
                except httpx.RequestError as e:
                    logger.exception(
                        f"Request failed for block {block.id}. Retrying..."
                    )
                    await asyncio.sleep(1 * attempt)
                    if attempt == 2:
                        raise e  # re-raise on last attempt

        # If all retries fail
        return BlockExecutionResult(
            status="error",
            output="API call failed after multiple retries.",
            exit_code=-1,
        )

    except Exception as e:
        logger.exception(f"Error executing API block {block.id}")
        return BlockExecutionResult(status="error", output=str(e), exit_code=-1)


async def execute_command_in_container(
    command: str, image_tag: str
) -> BlockExecutionResult:
    """
    Executes a shell command inside a new Docker container and returns the result.
    """
    try:
        client = docker.from_env()
        container = client.containers.run(
            image_tag, command, detach=True, network_mode="host"
        )
        result = container.wait()
        stdout = container.logs(stdout=True, stderr=False).decode("utf-8")
        stderr = container.logs(stdout=False, stderr=True).decode("utf-8")
        container.remove()

        exit_code = result["StatusCode"]
        status = "success" if exit_code == 0 else "error"
        output = f"{stdout}\n{stderr}".strip()

        return BlockExecutionResult(status=status, output=output, exit_code=exit_code)

    except docker.errors.ImageNotFound:
        return BlockExecutionResult(
            status="error",
            output=f"Execution environment image not found: {image_tag}",
            exit_code=-1,
        )
    except Exception as e:
        logger.exception(f"Error executing command in container with image {image_tag}")
        return BlockExecutionResult(status="error", output=str(e), exit_code=-1)


async def execute_command_block(
    block: Block, environment: ExecutionEnvironment | None
) -> BlockExecutionResult:
    """
    Executes a command block, either in a container or locally.
    """
    command = block.config.get("command")
    if not command:
        return BlockExecutionResult(
            status="error",
            output="Command block has no command configured.",
            exit_code=-1,
        )

    if environment and environment.image_tag:
        logger.info(
            f"Executing command for block {block.id} in container {environment.image_tag}"
        )
        return await execute_command_in_container(command, environment.image_tag)

    logger.info(f"Executing command for block {block.id} locally")
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        output = ""
        if stdout:
            output += stdout.decode()
        if stderr:
            output += stderr.decode()

        status = "success" if proc.returncode == 0 else "error"
        return BlockExecutionResult(
            status=status, output=output, exit_code=proc.returncode
        )

    except Exception as e:
        logger.exception(f"Error executing command for block {block.id}")
        return BlockExecutionResult(status="error", output=str(e), exit_code=-1)


async def execute_timer_block(block: Block) -> BlockExecutionResult:
    """
    Executes a timer block and returns the result without creating a database record.
    """
    duration = block.config.get("duration", 0)
    try:
        logger.info(f"Executing timer block {block.id}: pausing for {duration}s.")
        await asyncio.sleep(duration)
        logger.info(f"Timer block {block.id} finished.")
        return BlockExecutionResult(
            status="success",
            output=f"Timer finished after {duration} seconds.",
            exit_code=0,
        )
    except Exception as e:
        logger.exception(f"Error executing timer block {block.id}")
        return BlockExecutionResult(status="error", output=str(e), exit_code=-1)


async def execute_ssh_block(block: Block) -> BlockExecutionResult:
    """
    Executes an SSH block and returns the result without creating a database record.
    """
    config = block.config
    host = config.get("host")
    username = config.get("username")
    command = config.get("command")
    credential_id = config.get("credential_id")

    if not host or not username or not command:
        return BlockExecutionResult(
            status="error",
            output="SSH block missing host, username, or command.",
            exit_code=-1,
        )

    client_keys = None
    if credential_id:
        cred = await Credential.get(credential_id)
        if cred and cred.type == "ssh":
            try:
                private_key = decrypt_secret(cred.encrypted_secret)
                client_keys = [asyncssh.import_private_key(private_key)]
            except Exception as e:
                return BlockExecutionResult(
                    status="error",
                    output=f"Failed to load SSH key: {str(e)}",
                    exit_code=-1,
                )

    try:
        async with asyncssh.connect(
            host, username=username, client_keys=client_keys, known_hosts=None
        ) as conn:
            result = await conn.run(command)

            output = ""
            if result.stdout:
                output += result.stdout
            if result.stderr:
                output += result.stderr

            status = "success" if result.exit_status == 0 else "error"
            return BlockExecutionResult(
                status=status,
                output=output.strip(),
                exit_code=result.exit_status,
            )

    except Exception as e:
        logger.exception(f"Error executing SSH block {block.id}")
        return BlockExecutionResult(status="error", output=str(e), exit_code=-1)


async def process_ssh_block(job: ExecutionJob, block: Block) -> bool:
    """
    Executes an SSH block, captures the response, and records the step.
    Returns True on success, False otherwise.
    """
    step = ExecutionStep(
        job_id=job.id, block_id=block.id, status="running", output="", exit_code=-1
    )
    await step.insert()

    result = await execute_ssh_block(block)

    step.status = result.status
    step.output = result.output
    step.exit_code = result.exit_code
    await step.save()

    return result.status == "success"


async def process_api_block(job: ExecutionJob, block: Block) -> bool:
    """
    Executes an API call block, captures the response, and records the step.
    Returns True on success (2xx status code), False otherwise.
    """
    step = ExecutionStep(
        job_id=job.id, block_id=block.id, status="running", output="", exit_code=-1
    )
    await step.insert()

    result = await execute_api_block(block)

    step.status = result.status
    step.output = result.output
    step.exit_code = result.exit_code
    await step.save()

    return result.status == "success"


async def process_condition_block(
    job: ExecutionJob, block: Block, environment: ExecutionEnvironment | None
) -> bool:
    """
    Executes a conditional block. For now, only 'command' type is supported.
    Returns True if the condition is met, False otherwise.
    """
    condition_type = block.config.get("type")
    if condition_type != "command":
        logger.warning(f"Unsupported condition type '{condition_type}'")
        return True  # Treat as success

    # Re-use command processing logic for the condition
    return await process_command_block(job, block, environment)


async def process_command_block(
    job: ExecutionJob, block: Block, environment: ExecutionEnvironment | None
) -> bool:
    """
    Executes a command block, captures its output, and records the step.
    Returns True on success, False on failure.
    """
    step = ExecutionStep(
        job_id=job.id, block_id=block.id, status="running", output="", exit_code=-1
    )
    await step.insert()

    result = await execute_command_block(block, environment)

    step.status = result.status
    step.output = result.output
    step.exit_code = result.exit_code
    await step.save()

    return result.status == "success"


async def process_timer_block(job: ExecutionJob, block: Block) -> bool:
    """
    Pauses execution for a specified duration.
    """
    duration = block.config.get("duration", 0)
    step = ExecutionStep(
        job_id=job.id,
        block_id=block.id,
        status="running",
        output=f"Pausing for {duration} seconds.",
        exit_code=0,
    )
    await step.insert()

    await asyncio.sleep(duration)

    step.status = "success"
    await step.save()
    logger.info(f"Timer block {block.id} completed after {duration} seconds.")
    return True


async def run_job(job: ExecutionJob):
    """
    Runs a single execution job by processing its blocks sequentially.
    """
    logger.info(f"Starting job {job.id}")
    job.status = "running"
    await job.save()

    version = await RunbookVersion.get(job.version_id)
    if not version:
        logger.error(f"RunbookVersion {job.version_id} not found for job {job.id}")
        job.status = "failed"
        await job.save()
        return

    runbook = await Runbook.get(job.runbook_id)
    environment = (
        await ExecutionEnvironment.get(runbook.environment_id)
        if runbook and runbook.environment_id
        else None
    )

    # Sort blocks by their order
    sorted_blocks = sorted(version.blocks, key=lambda b: b.order)

    for block in sorted_blocks:
        # Check if the job has been externally stopped
        current_job_status = await ExecutionJob.get(job.id)
        if current_job_status.status != "running":
            logger.info(f"Job {job.id} was stopped externally. Halting execution.")
            return

        success = False
        if block.type == "command":
            success = await process_command_block(job, block, environment)
        elif block.type == "instruction":
            logger.info(f"Executing instruction block {block.id}: No action needed.")
            success = True
        elif block.type == "api":
            success = await process_api_block(job, block)
        elif block.type == "condition":
            success = await process_condition_block(job, block, environment)
        elif block.type == "timer":
            success = await process_timer_block(job, block)
        elif block.type == "ssh":
            success = await process_ssh_block(job, block)
        else:
            logger.warning(f"Block type '{block.type}' not yet supported.")
            success = True  # Treat unsupported types as success for now

        if not success:
            logger.error(f"Job {job.id} failed on block {block.id}")
            job.status = "failed"
            await job.save()
            return

    job.status = "completed"
    await job.save()
    logger.info(f"Job {job.id} completed successfully.")


async def execution_worker():
    """
    The main worker loop that polls for pending jobs and executes them.
    """
    logger.info("Execution worker started.")
    while True:
        pending_job = await ExecutionJob.find_one(ExecutionJob.status == "pending")
        if pending_job:
            try:
                await run_job(pending_job)
            except Exception:
                logger.exception(f"Unhandled error running job {pending_job.id}")
                pending_job.status = "failed"
                await pending_job.save()
        else:
            # Sleep when no jobs are found
            await asyncio.sleep(2)
