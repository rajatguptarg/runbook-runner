from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing_extensions import Literal

from app.models.credential import Credential
from app.models.user import User
from app.security import get_current_user, require_roles, encrypt_secret

router = APIRouter()


class CredentialCreate(BaseModel):
    name: str
    type: Literal["ssh", "api"]
    secret: str


class CredentialRead(BaseModel):
    id: UUID
    name: str
    type: Literal["ssh", "api"]
    created_by: UUID
    created_at: datetime


# Dependency for authorization - only SREs can manage credentials
auth = require_roles("sre")


@router.post(
    "",
    response_model=CredentialRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new credential",
)
async def create_credential(
    data: CredentialCreate,
    current_user: User = Depends(get_current_user),
    _=auth,
):
    """
    Create a new credential. The secret is encrypted before storage.
    """
    encrypted_secret = encrypt_secret(data.secret)
    credential = Credential(
        name=data.name,
        type=data.type,
        encrypted_secret=encrypted_secret,
        created_by=current_user.id,
    )
    await credential.insert()
    return CredentialRead(**credential.model_dump())


@router.get(
    "",
    response_model=List[CredentialRead],
    summary="List all credentials",
)
async def list_credentials(current_user: User = Depends(get_current_user), _=auth):
    """
    Retrieve a list of all credentials.
    """
    credentials = await Credential.find_all().to_list()
    return [CredentialRead(**c.model_dump()) for c in credentials]


@router.delete(
    "/{credential_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a credential",
)
async def delete_credential(
    credential_id: UUID,
    current_user: User = Depends(get_current_user),
    _=auth,
):
    """
    Delete a credential by its ID.
    """
    credential = await Credential.get(credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")

    await credential.delete()
    return None
