import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.logging_config import setup_logging
from app.security import require_roles
from app.api import (
    users,
    runbooks,
    versions,
    credentials,
    execution,
    audit,
    environments,
)
from app.db import create_init_beanie
from app.models import (
    User,
    Runbook,
    RunbookVersion,
    ExecutionJob,
    ExecutionStep,
    Credential,
    AuditLog,
    ExecutionEnvironment,
)
from app.services.execution import execution_worker

from contextlib import asynccontextmanager


# Apply logging configuration
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Initialize the database and start the background worker.
    """
    await init_db()
    asyncio.create_task(execution_worker())
    yield


app = FastAPI(
    title="Runbook Studio",
    description="A web-based application for actionable runbooks.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expose Prometheus metrics
Instrumentator().instrument(app).expose(app)

document_models = [
    User,
    Runbook,
    RunbookVersion,
    ExecutionJob,
    ExecutionStep,
    Credential,
    AuditLog,
    ExecutionEnvironment,
]
init_db = create_init_beanie(document_models)


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
app.include_router(execution.router, tags=["Execution"])
app.include_router(audit.router, prefix="/audit", tags=["Audit"])
app.include_router(environments.router, prefix="/environments", tags=["Environments"])
