from datetime import datetime, UTC
from typing import List
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING

from app.models.block import Block


class Runbook(Document):
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: str
    created_by: UUID
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "runbooks"


class RunbookVersion(Document):
    id: UUID = Field(default_factory=uuid4)
    runbook_id: UUID
    version_number: int
    blocks: List[Block]  # Embedded documents
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "runbook_versions"
        indexes = [
            IndexModel([("runbook_id", ASCENDING)]),
        ]
