import asyncio
import logging
from app.models.block import Block

from app.models.execution import ExecutionJob, ExecutionStep
from app.models.runbook import RunbookVersion

logger = logging.getLogger(__name__)


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
