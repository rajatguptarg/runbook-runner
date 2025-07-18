from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID, uuid4

from beanie import Document
from pydantic import Field


class AuditLog(Document):
    id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: UUID
    action: str  # e.g., "create_runbook", "delete_credential"
    target_id: UUID
    details: Optional[Dict[str, Any]] = None

    class Settings:
        name = "audit_logs"
