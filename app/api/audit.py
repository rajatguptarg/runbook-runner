from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.models.audit import AuditLog
from app.security import require_roles

router = APIRouter()

auth = require_roles("sre")


@router.get("", response_model=List[AuditLog], summary="Query audit logs")
async def get_audit_logs(
    user_id: UUID = Query(None, description="Filter by user ID"),
    action: str = Query(None, description="Filter by action type"),
    target_id: UUID = Query(None, description="Filter by target entity ID"),
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
    _=auth,
):
    """
    Retrieve a list of audit log entries, with optional filters.
    """
    query = {}
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    if target_id:
        query["target_id"] = target_id

    logs = await AuditLog.find(query).sort("-timestamp").limit(limit).to_list()
    return logs
