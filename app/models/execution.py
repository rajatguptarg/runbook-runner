from datetime import datetime, UTC
from typing import Optional
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING
from typing_extensions import Literal


class ExecutionJob(Document):
    id: UUID = Field(default_factory=uuid4)
    runbook_id: UUID
    version_id: UUID
    status: Literal["pending", "running", "completed", "failed"]
    start_time: datetime = Field(default_factory=lambda: datetime.now(UTC))
    end_time: Optional[datetime] = None

    class Settings:
        name = "execution_jobs"
        indexes = [
            IndexModel([("version_id", ASCENDING)]),
            IndexModel([("runbook_id", ASCENDING)]),
        ]


class ExecutionStep(Document):
    id: UUID = Field(default_factory=uuid4)
    job_id: UUID
    block_id: UUID
    status: Literal["pending", "running", "success", "error"]
    output: str  # stdout+stderr
    exit_code: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "execution_steps"
        indexes = [
            IndexModel([("job_id", ASCENDING)]),
        ]
