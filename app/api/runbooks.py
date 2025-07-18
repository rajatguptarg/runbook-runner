from datetime import datetime, UTC
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.block import Block
from app.models.runbook import Runbook, RunbookVersion
from app.models.user import User
from app.security import get_current_user, require_roles
from app.services.audit import log_action
from pydantic import BaseModel


router = APIRouter()


# Pydantic models for Runbook CRUD
class RunbookCreate(BaseModel):
    title: str
    description: str
    blocks: List[Block] = []
    tags: List[str] = []


class RunbookUpdate(BaseModel):
    title: str
    description: str
    blocks: List[Block]
    tags: List[str] = []


class RunbookRead(BaseModel):
    id: UUID
    title: str
    description: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    version: int
    blocks: List[Block]
    tags: List[str] = []


# Dependency for authorization
auth = require_roles("sre", "developer")


@router.post(
    "",
    response_model=RunbookRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new runbook",
)
async def create_runbook(
    data: RunbookCreate,
    current_user: User = Depends(get_current_user),
    _=auth,
):
    """
    Create a new runbook. This also creates the first version of the runbook.
    """
    runbook = Runbook(
        title=data.title,
        description=data.description,
        created_by=current_user.id,
        tags=data.tags,
    )
    await runbook.insert()

    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=data.blocks,
    )
    await version.insert()

    await log_action(
        current_user,
        "create_runbook",
        runbook.id,
        details={"title": data.title},
    )

    return RunbookRead(
        **runbook.model_dump(),
        version=version.version_number,
        blocks=version.blocks,
    )


@router.get(
    "",
    response_model=List[RunbookRead],
    summary="List all runbooks",
)
async def list_runbooks(_=auth):
    """
    Retrieve a list of all runbooks with their latest version.
    """
    runbooks = await Runbook.find_all().to_list()
    result = []
    for rb in runbooks:
        latest_version = (
            await RunbookVersion.find(RunbookVersion.runbook_id == rb.id)
            .sort("-version_number")
            .first_or_none()
        )

        if latest_version:
            result.append(
                RunbookRead(
                    **rb.model_dump(),
                    version=latest_version.version_number,
                    blocks=latest_version.blocks,
                )
            )
        else:  # Should not happen for runbooks created via API
            result.append(
                RunbookRead(
                    **rb.model_dump(),
                    version=0,
                    blocks=[],
                )
            )
    return result


@router.get(
    "/{runbook_id}",
    response_model=RunbookRead,
    summary="Fetch a single runbook",
)
async def get_runbook(runbook_id: UUID, _=auth):
    """
    Fetch a single runbook by its ID, including the blocks from its latest version.
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
        # This case might occur if a runbook was created without a version,
        # which shouldn't happen with the current create_runbook implementation.
        return RunbookRead(**runbook.model_dump(), version=0, blocks=[])

    return RunbookRead(
        **runbook.model_dump(),
        version=latest_version.version_number,
        blocks=latest_version.blocks,
    )


@router.put(
    "/{runbook_id}",
    response_model=RunbookRead,
    summary="Update a runbook",
)
async def update_runbook(
    runbook_id: UUID,
    data: RunbookUpdate,
    current_user: User = Depends(get_current_user),
    _=auth,
):
    """
    Update a runbook's title, description, and blocks. This creates a new version.
    """
    runbook = await Runbook.get(runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")

    latest_version = (
        await RunbookVersion.find(RunbookVersion.runbook_id == runbook.id)
        .sort("-version_number")
        .first_or_none()
    )

    new_version_number = (latest_version.version_number + 1) if latest_version else 1

    new_version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=new_version_number,
        blocks=data.blocks,
    )
    await new_version.insert()

    runbook.title = data.title
    runbook.description = data.description
    runbook.tags = data.tags
    runbook.updated_at = datetime.now(UTC)
    await runbook.save()

    await log_action(
        current_user,
        "update_runbook",
        runbook.id,
        details={"new_version": new_version.version_number},
    )

    return RunbookRead(
        **runbook.model_dump(),
        version=new_version.version_number,
        blocks=new_version.blocks,
    )


@router.delete(
    "/{runbook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a runbook",
)
async def delete_runbook(
    runbook_id: UUID, current_user: User = Depends(get_current_user), _=auth
):
    """
    Delete a runbook and all its associated versions.
    """
    runbook = await Runbook.get(runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")

    await RunbookVersion.find(RunbookVersion.runbook_id == runbook.id).delete()
    await runbook.delete()

    await log_action(current_user, "delete_runbook", runbook.id)

    return None
