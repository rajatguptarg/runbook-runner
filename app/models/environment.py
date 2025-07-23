from datetime import datetime, UTC
from typing import Optional
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class ExecutionEnvironment(Document):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    dockerfile: str
    image_tag: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: UUID

    class Settings:
        name = "execution_environments"
