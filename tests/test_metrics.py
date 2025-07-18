# ruff: noqa: E402
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_metrics_endpoint():
    # Make a request to an endpoint to generate metrics
    client.get("/")

    # Check the metrics endpoint
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert 'handler="/",' in response.text
