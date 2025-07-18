from uuid import UUID, uuid4

from beanie import Document, Indexed
from pydantic import Field


class User(Document):
    """User account stored in MongoDB."""

    id: UUID = Field(default_factory=uuid4)
    username: Indexed(str)
    password: str
    api_key: str
    role: str
