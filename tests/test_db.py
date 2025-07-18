from app.db import get_connection_string


def test_get_connection_string_uses_full_connection(monkeypatch):
    monkeypatch.setenv("DB_CONNECTION", "mongodb://user:pass@host")
    assert get_connection_string() == "mongodb://user:pass@host"


def test_get_connection_string_builds_from_parts(monkeypatch):
    monkeypatch.delenv("DB_CONNECTION", raising=False)
    monkeypatch.setenv("DB_USER", "u")
    monkeypatch.setenv("DB_PASSWORD", "p")
    monkeypatch.setenv("DB_HOST", "db")
    assert get_connection_string() == "mongodb://u:p@db"
