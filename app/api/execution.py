import asyncio
from datetime import datetime, UTC
from loguru import logger
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing_extensions import Literal

from app.models.block import Block
from app.models.execution import ExecutionJob, ExecutionStep
from app.models.runbook import Runbook, RunbookVersion
from app.security import require_roles
from typing import Optional

from app.services.execution import (
    execute_command_block,
    execute_api_block,
    BlockExecutionResult,
)

router = APIRouter()

# Dependency for authorization
auth = require_roles("sre", "developer")


class ExecutionResponse(BaseModel):
    job_id: UUID = Field(..., description="The ID of the created execution job.")


class ExecutionStepRead(ExecutionStep):
    block_name: Optional[str] = None


class ExecutionStatusResponse(BaseModel):
    job_id: UUID
    status: str
    steps: List[ExecutionStepRead]


class ControlRequest(BaseModel):
    action: Literal["stop"]


class BlockExecuteRequest(BaseModel):
    block: Block
    runbook_id: UUID


async def record_single_block_execution(
    runbook: Runbook, block: Block, result: BlockExecutionResult
):
    """
    Creates ExecutionJob and ExecutionStep records for a single block run.
    """
    # Find the latest version to link the job to
    latest_version = (
        await RunbookVersion.find(RunbookVersion.runbook_id == runbook.id)
        .sort("-version_number")
        .first_or_none()
    )
    version_id = latest_version.id if latest_version else None

    job_status = "completed" if result.status == "success" else "failed"

    job = ExecutionJob(
        runbook_id=runbook.id,
        version_id=version_id,
        status=job_status,
        end_time=datetime.now(UTC),  # It's an instant job
    )
    await job.insert()

    step = ExecutionStep(
        job_id=job.id,
        block_id=block.id,
        status=result.status,
        output=result.output,
        exit_code=result.exit_code,
    )
    await step.insert()
    logger.info(f"Recorded single block execution for job {job.id}")


@router.post(
    "/blocks/execute",
    response_model=BlockExecutionResult,
    summary="Execute a single block",
)
async def execute_block(request: BlockExecuteRequest, _=auth):
    """
    Execute a single block, return the result immediately,
    and record the execution in the history.
    """
    block = request.block
    runbook_id = request.runbook_id

    # Find the runbook to associate the job with
    runbook = await Runbook.get(runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Associated runbook not found")

    # Execute the block to get the result first
    if block.type == "command":
        result = await execute_command_block(block)
    elif block.type == "api":
        result = await execute_api_block(block)
    elif block.type == "instruction":
        result = BlockExecutionResult(
            status="success", output="Instruction viewed.", exit_code=0
        )
    else:
        raise HTTPException(
            status_code=400, detail=f"Block type '{block.type}' cannot be executed."
        )

    # Now, create the history records in the background
    asyncio.create_task(record_single_block_execution(runbook, block, result))

    return result


@router.post(
    "/runbooks/{runbook_id}/execute",
    response_model=ExecutionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue a new execution job",
)
async def enqueue_execution(runbook_id: UUID, _=auth):
    """
    Enqueue a new execution job for the latest version of a runbook.
    """
    runbook = await Runbook.get(runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")

    latest_version = (
        await RunbookVersion.find(RunbookVersion.runbook_id == runbook.id)
        .sort("-version_number")
        .first_or_none()
    )

    if not latest_version:
        raise HTTPException(
            status_code=400, detail="Cannot execute a runbook with no versions"
        )

    job = ExecutionJob(
        runbook_id=runbook.id,
        version_id=latest_version.id,
        status="pending",
    )
    await job.insert()

    return ExecutionResponse(job_id=job.id)


class ExecutionJobRead(BaseModel):
    id: UUID
    runbook_id: UUID
    version_id: UUID
    status: Literal["pending", "running", "completed", "failed"]
    start_time: datetime
    end_time: Optional[datetime] = None
    runbook_title: str


@router.get(
    "/executions",
    response_model=List[ExecutionJobRead],
    summary="List all execution jobs",
)
async def list_all_executions(_=auth):
    """
    Retrieve a list of all execution jobs with their runbook titles.
    """
    jobs = await ExecutionJob.find_all().sort("-start_time").to_list()
    results = []
    for job in jobs:
        if not job.runbook_id:  # Gracefully handle old data
            continue
        runbook = await Runbook.get(job.runbook_id)
        title = runbook.title if runbook else "Unknown Runbook"
        job_dict = job.model_dump()
        job_dict["runbook_title"] = title
        results.append(ExecutionJobRead(**job_dict))
    return results


@router.get(
    "/executions/{job_id}",
    response_model=ExecutionStatusResponse,
    summary="Get job status and step outputs",
)
async def get_execution_status(job_id: UUID, _=auth):
    """
    Get the status and output of an execution job.
    """
    job = await ExecutionJob.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Execution job not found")

    # Fetch the version to get block names
    version = await RunbookVersion.get(job.version_id) if job.version_id else None
    block_id_to_name_map = (
        {str(b.id): b.name for b in version.blocks} if version else {}
    )

    steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
    enriched_steps = []
    for step in steps:
        step_dict = step.model_dump()
        step_dict["block_name"] = block_id_to_name_map.get(str(step.block_id))
        enriched_steps.append(ExecutionStepRead(**step_dict))

    return ExecutionStatusResponse(
        job_id=job.id,
        status=job.status,
        steps=enriched_steps,
    )


@router.post(
    "/executions/{job_id}/control",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Pause, resume, or stop a job",
)
async def control_execution(job_id: UUID, request: ControlRequest, _=auth):
    """
    Pause, resume, or stop a job.
    """
    job = await ExecutionJob.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Execution job not found")

    if request.action == "stop":
        if job.status in ["running", "pending"]:
            job.status = "failed"  # Treat stopped jobs as failed for now
            await job.save()
            return {"message": "Job stop request accepted."}
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot stop a job in '{job.status}' state.",
            )
    return {"message": "Action not yet implemented."}


@router.delete(
    "/executions/clear",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear all execution history",
)
async def clear_all_executions(_=auth):
    """
    Delete all execution jobs and steps.
    """
    await ExecutionJob.delete_all()
    await ExecutionStep.delete_all()
    return None
