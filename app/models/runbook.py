from datetime import datetime
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "runbooks"


class RunbookVersion(Document):
    id: UUID = Field(default_factory=uuid4)
    runbook_id: UUID
    version_number: int
    blocks: List[Block]  # Embedded documents
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "runbook_versions"
        indexes = [
            IndexModel([("runbook_id", ASCENDING)]),
        ]
