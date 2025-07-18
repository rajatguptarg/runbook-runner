from fastapi import FastAPI

from app.security import require_roles
from app.api import users, runbooks, versions, credentials
from app.db import create_init_beanie
from app.models import (
    User,
    Runbook,
    RunbookVersion,
    ExecutionJob,
    ExecutionStep,
    Credential,
)

app = FastAPI(
    title="Runbook Studio",
    description="A web-based application for actionable runbooks.",
    version="0.1.0",
)

document_models = [
    User,
    Runbook,
    RunbookVersion,
    ExecutionJob,
    ExecutionStep,
    Credential,
]
app.add_event_handler("startup", create_init_beanie(document_models))


@app.get("/", summary="Health check")
def read_root():
    """
    A simple health check endpoint.
    """
    return {"Hello": "World"}


@app.get("/protected", summary="Test authentication")
async def protected(_=require_roles("sre")):
    """
    An endpoint to test role-based access control. Requires 'sre' role.
    """
    return {"protected": True}


app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(runbooks.router, prefix="/runbooks", tags=["Runbooks"])
app.include_router(versions.router, prefix="/runbooks", tags=["Runbooks"])
app.include_router(credentials.router, prefix="/credentials", tags=["Credentials"])
