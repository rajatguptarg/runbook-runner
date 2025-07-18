from uuid import UUID
from typing import Dict, Any, Optional

from app.models.audit import AuditLog
from app.models.user import User


async def log_action(
    user: User,
    action: str,
    target_id: UUID,
    details: Optional[Dict[str, Any]] = None,
):
    """
    Creates and saves an audit log entry.
    """
    log_entry = AuditLog(
        user_id=user.id,
        action=action,
        target_id=target_id,
        details=details,
    )
    await log_entry.insert()
