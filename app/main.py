from fastapi import FastAPI

from app.security import require_roles
from app.api import users as users_router
from app.db import create_init_beanie
from app.models import User

app = FastAPI(
    title="Runbook Studio",
    description="A web-based application for actionable runbooks.",
    version="0.1.0",
)
app.add_event_handler("startup", create_init_beanie([User]))


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


app.include_router(users_router.router, prefix="/users", tags=["Users"])
