from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.runbooks import RunbookRead
from app.models.runbook import Runbook, RunbookVersion
from app.security import require_roles

router = APIRouter()

auth = require_roles("sre", "developer")


@router.get(
    "/{runbook_id}/versions",
    response_model=List[RunbookRead],
    summary="List all versions for a runbook",
)
async def list_versions(runbook_id: UUID, _=auth):
    """
    Retrieve a list of all historical versions for a specific runbook.
    """
    if not await Runbook.get(runbook_id):
        raise HTTPException(status_code=404, detail="Runbook not found")

    versions = (
        await RunbookVersion.find(RunbookVersion.runbook_id == runbook_id)
        .sort("+version_number")
        .to_list()
    )

    if not versions:
        return []

    # This is inefficient, but simple. A better implementation would avoid N+1 queries.
    result = []
    for version in versions:
        runbook = await Runbook.get(version.runbook_id)
        result.append(
            RunbookRead(
                **runbook.model_dump(),
                version=version.version_number,
                blocks=version.blocks,
            )
        )
    return result


@router.post(
    "/{runbook_id}/versions/{version_number}/rollback",
    response_model=RunbookRead,
    summary="Roll back to a specific version",
)
async def rollback_to_version(runbook_id: UUID, version_number: int, _=auth):
    """
    Roll back a runbook to a specific version by creating a new version
    that is a copy of the target version's content.
    """
    runbook = await Runbook.get(runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")

    target_version = await RunbookVersion.find_one(
        RunbookVersion.runbook_id == runbook_id,
        RunbookVersion.version_number == version_number,
    )

    if not target_version:
        raise HTTPException(status_code=404, detail="Version not found")

    latest_version = (
        await RunbookVersion.find(RunbookVersion.runbook_id == runbook.id)
        .sort("-version_number")
        .first_or_none()
    )

    new_version_number = (latest_version.version_number + 1) if latest_version else 1

    # Create a new version with the content of the version we are rolling back to
    new_version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=new_version_number,
        blocks=target_version.blocks,
    )
    await new_version.insert()

    return RunbookRead(
        **runbook.model_dump(),
        version=new_version.version_number,
        blocks=new_version.blocks,
    )
