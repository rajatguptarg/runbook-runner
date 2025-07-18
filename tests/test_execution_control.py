# ruff: noqa: E402
import asyncio
import sys
from pathlib import Path
from uuid import UUID

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import app.db as db
from app.main import app
from app.models import ExecutionJob, Runbook, RunbookVersion, Block


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    monkeypatch.setattr(db, "AsyncIOMotorClient", AsyncMongoMockClient)
    monkeypatch.setenv("DB_USER", "u")
    monkeypatch.setenv("DB_PASSWORD", "p")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_NAME", "testdb")
    monkeypatch.setenv("SECRET_KEY", "870STvCfnd0oNi-TeWJM6986M9Rfm26zbnIgTOKwDLw=")
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sre_token(client: TestClient) -> str:
    resp = client.post(
        "/users/signup",
        json={"username": "sre_user", "password": "pw", "role": "sre"},
    )
    assert resp.status_code == 201
    return resp.json()["api_key"]


@pytest_asyncio.fixture
async def pending_job(sre_token: str) -> ExecutionJob:
    runbook = Runbook(
        title="Test RB",
        description="d",
        created_by=UUID(sre_token[:32].replace("-", "")),
    )
    await runbook.insert()
    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[Block(type="command", config={"command": "echo 'hello'"}, order=1)],
    )
    await version.insert()
    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()
    return job


@pytest.mark.asyncio
async def test_get_execution_status(
    client: TestClient, sre_token: str, pending_job: ExecutionJob
):
    headers = {"X-API-KEY": sre_token}
    resp = client.get(f"/executions/{pending_job.id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == str(pending_job.id)
    assert data["status"] == "pending"
    assert len(data["steps"]) == 0


@pytest.mark.asyncio
async def test_stop_pending_job(
    client: TestClient, sre_token: str, pending_job: ExecutionJob
):
    headers = {"X-API-KEY": sre_token}
    resp = client.post(
        f"/executions/{pending_job.id}/control",
        headers=headers,
        json={"action": "stop"},
    )
    assert resp.status_code == 202

    updated_job = await ExecutionJob.get(pending_job.id)
    assert updated_job.status == "failed"


@pytest.mark.asyncio
async def test_stop_running_job(
    client: TestClient, sre_token: str, pending_job: ExecutionJob
):
    # Manually set the job to running
    pending_job.status = "running"
    await pending_job.save()

    headers = {"X-API-KEY": sre_token}
    resp = client.post(
        f"/executions/{pending_job.id}/control",
        headers=headers,
        json={"action": "stop"},
    )
    assert resp.status_code == 202

    updated_job = await ExecutionJob.get(pending_job.id)
    assert updated_job.status == "failed"


@pytest.mark.asyncio
async def test_stop_completed_job(
    client: TestClient, sre_token: str, pending_job: ExecutionJob
):
    # Manually set the job to completed
    pending_job.status = "completed"
    await pending_job.save()

    headers = {"X-API-KEY": sre_token}
    resp = client.post(
        f"/executions/{pending_job.id}/control",
        headers=headers,
        json={"action": "stop"},
    )
    assert resp.status_code == 400
