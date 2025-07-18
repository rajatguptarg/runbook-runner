from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class User(Document):
    """User account stored in MongoDB."""

    id: UUID = Field(default_factory=uuid4)
    username: str = Field(index=True)
    password: str
    api_key: str
    role: str
