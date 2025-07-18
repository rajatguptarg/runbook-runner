from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing_extensions import Literal

from app.models.execution import ExecutionJob, ExecutionStep
from app.models.runbook import Runbook, RunbookVersion
from app.security import require_roles

router = APIRouter()

# Dependency for authorization
auth = require_roles("sre", "developer")


class ExecutionResponse(BaseModel):
    job_id: UUID = Field(..., description="The ID of the created execution job.")


class ExecutionStatusResponse(BaseModel):
    job_id: UUID
    status: str
    steps: List[ExecutionStep]


class ControlRequest(BaseModel):
    action: Literal["stop"]


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
        version_id=latest_version.id,
        status="pending",
    )
    await job.insert()

    return ExecutionResponse(job_id=job.id)


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

    steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()

    return ExecutionStatusResponse(
        job_id=job.id,
        status=job.status,
        steps=steps,
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
