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
from app.models import Credential
from app.security import decrypt_secret


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


@pytest.fixture
def developer_token(client: TestClient) -> str:
    resp = client.post(
        "/users/signup",
        json={"username": "dev_user", "password": "pw", "role": "developer"},
    )
    assert resp.status_code == 201
    return resp.json()["api_key"]


@pytest.mark.asyncio
async def test_create_credential(client: TestClient, sre_token: str):
    headers = {"X-API-KEY": sre_token}
    cred_data = {"name": "My API Key", "type": "api", "secret": "supersecret"}
    resp = client.post("/credentials", headers=headers, json=cred_data)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My API Key"
    assert "id" in data

    cred = await Credential.get(UUID(data["id"]))
    assert cred is not None
    assert cred.name == "My API Key"
    decrypted_secret = decrypt_secret(cred.encrypted_secret)
    assert decrypted_secret == "supersecret"


def test_create_credential_forbidden_for_developer(
    client: TestClient, developer_token: str
):
    headers = {"X-API-KEY": developer_token}
    cred_data = {"name": "My API Key", "type": "api", "secret": "supersecret"}
    resp = client.post("/credentials", headers=headers, json=cred_data)
    assert resp.status_code == 403


def test_list_credentials(client: TestClient, sre_token: str):
    headers = {"X-API-KEY": sre_token}
    client.post(
        "/credentials",
        headers=headers,
        json={"name": "Key1", "type": "api", "secret": "s1"},
    )
    client.post(
        "/credentials",
        headers=headers,
        json={"name": "Key2", "type": "ssh", "secret": "s2"},
    )

    resp = client.get("/credentials", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["name"] == "Key1"
    assert data[1]["name"] == "Key2"
    assert "secret" not in data[0]  # Ensure secret is not returned


def test_delete_credential(client: TestClient, sre_token: str):
    headers = {"X-API-KEY": sre_token}
    create_resp = client.post(
        "/credentials",
        headers=headers,
        json={"name": "Key to delete", "type": "api", "secret": "s1"},
    )
    cred_id = create_resp.json()["id"]

    resp = client.delete(f"/credentials/{cred_id}", headers=headers)
    assert resp.status_code == 204

    # Verify it's deleted
    get_resp = client.get("/credentials", headers=headers)
    assert len(get_resp.json()) == 0

    # Test deleting non-existent
    resp = client.delete(
        f"/credentials/{UUID('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3')}",
        headers=headers,
    )
    assert resp.status_code == 404
