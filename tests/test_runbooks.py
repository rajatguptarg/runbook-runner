# ruff: noqa: E402
import sys
from pathlib import Path
from uuid import UUID

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import app.db as db
from app.main import app
from app.models import Runbook, RunbookVersion


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    monkeypatch.setattr(db, "AsyncIOMotorClient", AsyncMongoMockClient)
    monkeypatch.setenv("DB_USER", "u")
    monkeypatch.setenv("DB_PASSWORD", "p")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_NAME", "testdb")
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def authenticated_user_token(client: TestClient) -> str:
    resp = client.post(
        "/users/signup",
        json={"username": "testuser", "password": "pw", "role": "sre"},
    )
    assert resp.status_code == 201
    return resp.json()["api_key"]


@pytest.mark.asyncio
async def test_create_runbook(client: TestClient, authenticated_user_token: str):
    headers = {"X-API-KEY": authenticated_user_token}
    runbook_data = {
        "title": "My First Runbook",
        "description": "This is a test runbook.",
        "blocks": [{"type": "instruction", "config": {"text": "Step 1"}, "order": 1}],
    }
    resp = client.post("/runbooks", headers=headers, json=runbook_data)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My First Runbook"
    assert data["version"] == 1
    assert len(data["blocks"]) == 1
    assert data["blocks"][0]["type"] == "instruction"

    runbook = await Runbook.get(UUID(data["id"]))
    assert runbook is not None
    version = await RunbookVersion.find_one(RunbookVersion.runbook_id == runbook.id)
    assert version is not None
    assert version.version_number == 1


def test_list_runbooks(client: TestClient, authenticated_user_token: str):
    headers = {"X-API-KEY": authenticated_user_token}
    # Create a runbook first
    client.post(
        "/runbooks",
        headers=headers,
        json={"title": "RB1", "description": "d1", "blocks": []},
    )

    resp = client.get("/runbooks", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "RB1"


def test_get_runbook(client: TestClient, authenticated_user_token: str):
    headers = {"X-API-KEY": authenticated_user_token}
    create_resp = client.post(
        "/runbooks",
        headers=headers,
        json={"title": "RB1", "description": "d1", "blocks": []},
    )
    runbook_id = create_resp.json()["id"]

    resp = client.get(f"/runbooks/{runbook_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == runbook_id
    assert data["title"] == "RB1"


@pytest.mark.asyncio
async def test_update_runbook(client: TestClient, authenticated_user_token: str):
    headers = {"X-API-KEY": authenticated_user_token}
    create_resp = client.post(
        "/runbooks",
        headers=headers,
        json={"title": "RB1", "description": "d1", "blocks": []},
    )
    runbook_id = create_resp.json()["id"]

    update_data = {
        "title": "Updated Title",
        "description": "Updated description",
        "blocks": [{"type": "command", "config": {"command": "ls"}, "order": 1}],
    }
    resp = client.put(f"/runbooks/{runbook_id}", headers=headers, json=update_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Title"
    assert data["version"] == 2
    assert len(data["blocks"]) == 1
    assert data["blocks"][0]["type"] == "command"

    runbook = await Runbook.get(UUID(runbook_id))
    assert runbook.title == "Updated Title"
    versions = await RunbookVersion.find(
        RunbookVersion.runbook_id == runbook.id
    ).to_list()
    assert len(versions) == 2


@pytest.mark.asyncio
async def test_delete_runbook(client: TestClient, authenticated_user_token: str):
    headers = {"X-API-KEY": authenticated_user_token}
    create_resp = client.post(
        "/runbooks",
        headers=headers,
        json={"title": "RB to delete", "description": "d1", "blocks": []},
    )
    runbook_id = create_resp.json()["id"]

    resp = client.delete(f"/runbooks/{runbook_id}", headers=headers)
    assert resp.status_code == 204

    assert await Runbook.get(UUID(runbook_id)) is None
    assert (
        await RunbookVersion.find_one(RunbookVersion.runbook_id == UUID(runbook_id))
        is None
    )

    # Test deleting non-existent
    resp = client.delete(
        f"/runbooks/{UUID('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3')}",
        headers=headers,
    )
    assert resp.status_code == 404
