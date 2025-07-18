import asyncio
import logging
import httpx
from app.models.block import Block

from app.models.credential import Credential
from app.models.execution import ExecutionJob, ExecutionStep
from app.models.runbook import RunbookVersion
from app.security import decrypt_secret

logger = logging.getLogger(__name__)


async def process_api_block(job: ExecutionJob, block: Block) -> bool:
    """
    Executes an API call block, captures the response, and records the step.
    Returns True on success (2xx status code), False otherwise.
    """
    config = block.config
    method = config.get("method", "GET")
    url = config.get("url")
    headers = config.get("headers", {})
    body = config.get("body")
    credential_id = config.get("credential_id")

    if not url:
        logger.error(f"API block {block.id} has no URL configured.")
        return False

    step = ExecutionStep(
        job_id=job.id,
        block_id=block.id,
        status="running",
        output="",
        exit_code=-1,
    )
    await step.insert()

    if credential_id:
        cred = await Credential.get(credential_id)
        if cred and cred.type == "api":
            token = decrypt_secret(cred.encrypted_secret)
            headers["Authorization"] = f"Bearer {token}"

    try:
        async with httpx.AsyncClient() as client:
            for attempt in range(3):  # Retry up to 3 times
                try:
                    response = await client.request(
                        method, url, headers=headers, json=body, timeout=10.0
                    )
                    step.output = (
                        f"Status: {response.status_code}\n"
                        f"Headers: {response.headers}\n"
                        f"Body: {response.text}"
                    )
                    step.exit_code = response.status_code
                    if 200 <= response.status_code < 300:
                        step.status = "success"
                        await step.save()
                        return True
                    elif 500 <= response.status_code < 600:
                        logger.warning(
                            f"API call for block {block.id} failed with {response.status_code}. Retrying..."
                        )
                        await asyncio.sleep(1 * attempt)
                        continue
                    else:
                        step.status = "error"
                        await step.save()
                        return False
                except httpx.RequestError as e:
                    logger.exception(
                        f"Request failed for block {block.id}. Retrying..."
                    )
                    await asyncio.sleep(1 * attempt)
                    if attempt == 2:
                        raise e  # re-raise on last attempt

        # If all retries fail
        step.status = "error"
        await step.save()
        return False

    except Exception as e:
        logger.exception(f"Error executing API block {block.id}")
        step.output = str(e)
        step.status = "error"
        await step.save()
        return False


async def process_condition_block(job: ExecutionJob, block: Block) -> bool:
    """
    Executes a conditional block. For now, only 'command' type is supported.
    Returns True if the condition is met, False otherwise.
    """
    condition_type = block.config.get("type")
    if condition_type != "command":
        logger.warning(f"Unsupported condition type '{condition_type}'")
        return True  # Treat as success

    # Re-use command processing logic for the condition
    return await process_command_block(job, block)


async def process_command_block(job: ExecutionJob, block: Block) -> bool:
    """
    Executes a command block, captures its output, and records the step.
    Returns True on success, False on failure.
    """
    command = block.config.get("command")
    if not command:
        logger.error(f"Command block {block.id} has no command configured.")
        return False

    step = ExecutionStep(
        job_id=job.id,
        block_id=block.id,
        status="running",
        output="",
        exit_code=-1,
    )
    await step.insert()

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

        step.output = output
        step.exit_code = proc.returncode
        step.status = "success" if proc.returncode == 0 else "error"
        await step.save()

        return proc.returncode == 0

    except Exception as e:
        logger.exception(f"Error executing command for block {block.id}")
        step.output = str(e)
        step.status = "error"
        await step.save()
        return False


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
            success = await process_command_block(job, block)
        elif block.type == "instruction":
            logger.info(f"Executing instruction block {block.id}: No action needed.")
            success = True
        elif block.type == "api":
            success = await process_api_block(job, block)
        elif block.type == "condition":
            success = await process_condition_block(job, block)
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
