# ruff: noqa: E402
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import app.db as db
from app.main import app


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


def create_runbook_with_versions(client: TestClient, headers: dict) -> str:
    # Create v1
    resp = client.post(
        "/runbooks",
        headers=headers,
        json={
            "title": "Versioned Runbook",
            "description": "v1",
            "blocks": [{"type": "instruction", "config": {"text": "v1"}, "order": 1}],
        },
    )
    assert resp.status_code == 201
    runbook_id = resp.json()["id"]

    # Create v2
    client.put(
        f"/runbooks/{runbook_id}",
        headers=headers,
        json={
            "title": "Versioned Runbook",
            "description": "v2",
            "blocks": [{"type": "instruction", "config": {"text": "v2"}, "order": 1}],
        },
    )
    return runbook_id


def test_list_versions(client: TestClient, authenticated_user_token: str):
    headers = {"X-API-KEY": authenticated_user_token}
    runbook_id = create_runbook_with_versions(client, headers)

    resp = client.get(f"/runbooks/{runbook_id}/versions", headers=headers)
    assert resp.status_code == 200
    versions = resp.json()
    assert len(versions) == 2
    assert versions[0]["version"] == 1
    assert versions[0]["blocks"][0]["config"]["text"] == "v1"
    assert versions[1]["version"] == 2
    assert versions[1]["blocks"][0]["config"]["text"] == "v2"


def test_rollback_version(client: TestClient, authenticated_user_token: str):
    headers = {"X-API-KEY": authenticated_user_token}
    runbook_id = create_runbook_with_versions(client, headers)

    # Roll back to version 1
    resp = client.post(f"/runbooks/{runbook_id}/versions/1/rollback", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["version"] == 3
    assert len(data["blocks"]) == 1
    assert data["blocks"][0]["config"]["text"] == "v1"

    # Verify the new version was created
    resp = client.get(f"/runbooks/{runbook_id}/versions", headers=headers)
    versions = resp.json()
    assert len(versions) == 3
    assert versions[2]["version"] == 3
    assert versions[2]["blocks"][0]["config"]["text"] == "v1"


def test_rollback_non_existent_version(
    client: TestClient, authenticated_user_token: str
):
    headers = {"X-API-KEY": authenticated_user_token}
    runbook_id = create_runbook_with_versions(client, headers)

    resp = client.post(f"/runbooks/{runbook_id}/versions/99/rollback", headers=headers)
    assert resp.status_code == 404
