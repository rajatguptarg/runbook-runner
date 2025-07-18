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
        # Sign up
        resp = client.post(
            "/users/signup",
            json={"username": "alice", "password": "pw", "role": "sre"},
        )
        assert resp.status_code == 201
        api_key = resp.json()["api_key"]

        # Log in
        resp = client.post("/users/login", json={"username": "alice", "password": "pw"})
        assert resp.status_code == 200
        assert resp.json()["api_key"] == api_key

        # Access protected route
        resp = client.get("/protected", headers={"X-API-KEY": api_key})
        assert resp.status_code == 200
        assert resp.json() == {"protected": True}


def test_invalid_role_forbidden():
    with TestClient(app) as client:
        # Sign up with a non-privileged role
        resp = client.post(
            "/users/signup",
            json={"username": "bob", "password": "pw", "role": "developer"},
        )
        assert resp.status_code == 201
        api_key = resp.json()["api_key"]

        # Attempt to access protected route
        resp = client.get("/protected", headers={"X-API-KEY": api_key})
        assert resp.status_code == 403


def test_missing_api_key_unauthorized():
    with TestClient(app) as client:
        # Attempt to access protected route without API key
        resp = client.get("/protected")
        assert resp.status_code == 401
