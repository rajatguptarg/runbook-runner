# ruff: noqa: E402
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import app.db as db
from app.main import app
from app.models import AuditLog


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


@pytest.mark.asyncio
async def test_runbook_creation_is_audited(client: TestClient, sre_token: str):
    headers = {"X-API-KEY": sre_token}
    client.post(
        "/runbooks",
        headers=headers,
        json={"title": "Audited Runbook", "description": "d1", "blocks": []},
    )

    log = await AuditLog.find_one(AuditLog.action == "create_runbook")
    assert log is not None
    assert log.details["title"] == "Audited Runbook"


@pytest.mark.asyncio
async def test_get_audit_logs(client: TestClient, sre_token: str):
    headers = {"X-API-KEY": sre_token}
    # Create some activity
    rb_resp = client.post(
        "/runbooks",
        headers=headers,
        json={"title": "Audited Runbook", "description": "d1", "blocks": []},
    )
    runbook_id = rb_resp.json()["id"]
    client.put(
        f"/runbooks/{runbook_id}",
        headers=headers,
        json={"title": "Updated Title", "description": "d2", "blocks": []},
    )
    client.delete(f"/runbooks/{runbook_id}", headers=headers)

    # Get all logs
    resp = client.get("/audit", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) == 3

    # Filter by action
    resp = client.get("/audit?action=delete_runbook", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) == 1
    assert logs[0]["action"] == "delete_runbook"

    # Filter by target
    resp = client.get(f"/audit?target_id={runbook_id}", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) == 3  # All actions were on this runbook
