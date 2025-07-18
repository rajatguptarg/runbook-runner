from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from typing import Dict, Any
from typing_extensions import Literal


class Block(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: Literal["instruction", "command", "api", "condition", "timer"]
    config: Dict[str, Any]
    order: int
