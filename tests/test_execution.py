# ruff: noqa: E402
import sys
from pathlib import Path
from uuid import UUID, uuid4
from unittest.mock import patch, AsyncMock

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import app.db as db
from app.main import app
from app.models import ExecutionJob, Runbook


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    # Use a consistent, valid Fernet key for tests
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


@pytest.fixture
def runbook_id(client: TestClient, sre_token: str) -> str:
    headers = {"X-API-KEY": sre_token}
    resp = client.post(
        "/runbooks",
        headers=headers,
        json={
            "title": "My Execution Runbook",
            "description": "A test runbook.",
            "blocks": [
                {"type": "instruction", "config": {"text": "Step 1"}, "order": 1}
            ],
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_enqueue_execution(client: TestClient, sre_token: str, runbook_id: str):
    headers = {"X-API-KEY": sre_token}
    resp = client.post(f"/runbooks/{runbook_id}/execute", headers=headers)
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data

    job_id = UUID(data["job_id"])
    job = await ExecutionJob.get(job_id)
    assert job is not None
    assert job.status == "pending"

    runbook = await Runbook.get(UUID(runbook_id))
    # This is a bit indirect, but we check if the job's
    # version_id is one of the runbook's versions
    # For this test, there is only one version.
    from app.models import RunbookVersion

    latest_version = await RunbookVersion.find_one(
        RunbookVersion.runbook_id == runbook.id
    )
    assert job.version_id == latest_version.id


def test_enqueue_non_existent_runbook(client: TestClient, sre_token: str):
    headers = {"X-API-KEY": sre_token}
    fake_id = UUID("c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3")
    resp = client.post(f"/runbooks/{fake_id}/execute", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_enqueue_runbook_with_no_versions(client: TestClient, sre_token: str):
    headers = {"X-API-KEY": sre_token}
    # Create a runbook manually without a version
    runbook = Runbook(
        title="No Versions",
        description="d",
        created_by=UUID(sre_token[:32].replace("-", "")),
    )  # Fake UUID
    await runbook.insert()

    resp = client.post(f"/runbooks/{runbook.id}/execute", headers=headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Cannot execute a runbook with no versions"


@pytest.mark.asyncio
async def test_execute_single_timer_block(
    client: TestClient, sre_token: str, runbook_id: str
):
    headers = {"X-API-KEY": sre_token}
    block_data = {
        "type": "timer",
        "config": {"duration": 1},
        "order": 1,
        "name": "Test Timer",
        "id": str(uuid4()),
    }

    request_data = {"runbook_id": runbook_id, "block": block_data}

    with patch(
        "app.services.execution.asyncio.sleep", new_callable=AsyncMock
    ) as mock_sleep:
        resp = client.post("/blocks/execute", headers=headers, json=request_data)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["exit_code"] == 0
        assert "Timer finished after 1 seconds" in data["output"]
        mock_sleep.assert_called_once_with(1)
