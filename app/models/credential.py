from datetime import datetime
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field
from typing_extensions import Literal


class Credential(Document):
    id: UUID = Field(default_factory=uuid4)
    name: str
    type: Literal["ssh", "api"]
    encrypted_secret: str
    created_by: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "credentials"
