from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.execution import ExecutionJob
from app.models.runbook import Runbook, RunbookVersion
from app.security import require_roles

router = APIRouter()

# Dependency for authorization
auth = require_roles("sre", "developer")


class ExecutionResponse(BaseModel):
    job_id: UUID = Field(..., description="The ID of the created execution job.")


@router.post(
    "/{runbook_id}/execute",
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
