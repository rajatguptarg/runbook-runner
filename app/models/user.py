from beanie import Document
from pydantic import Field


class User(Document):
    """User account stored in MongoDB."""

    username: str = Field(index=True)
    password: str
    api_key: str
    role: str
