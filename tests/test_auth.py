# ruff: noqa: E402
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


def test_signup_login_and_access():
    with TestClient(app) as client:

        resp = client.post(
            "/signup", json={"username": "alice", "password": "pw", "role": "sre"}
        )
        assert resp.status_code == 200
        api_key = resp.json()["api_key"]

        resp = client.post("/login", json={"username": "alice", "password": "pw"})
        assert resp.status_code == 200
        assert resp.json()["api_key"] == api_key

        resp = client.get("/protected", headers={"X-API-KEY": api_key})
        assert resp.status_code == 200
        assert resp.json() == {"protected": True}


def test_invalid_role_forbidden():
    with TestClient(app) as client:

        resp = client.post(
            "/signup", json={"username": "bob", "password": "pw", "role": "developer"}
        )
        api_key = resp.json()["api_key"]

        resp = client.get("/protected", headers={"X-API-KEY": api_key})
        assert resp.status_code == 403


def test_missing_api_key_unauthorized():
    with TestClient(app) as client:

        client.post("/signup", json={"username": "c", "password": "pw", "role": "sre"})
        resp = client.get("/protected")
        assert resp.status_code == 401
