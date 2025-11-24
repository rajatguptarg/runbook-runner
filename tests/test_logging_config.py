import json
from loguru import logger
from app.logging_config import setup_logging
import pytest

def test_json_logging_format(capsys):
    # Setup logging
    setup_logging()

    # Log a message
    test_message = "Test log message"
    test_context = "test_value"
    logger.info(test_message, context=test_context)

    # Wait for async logging to complete
    logger.complete()

    # Capture output
    captured = capsys.readouterr()
    output = captured.out.strip()

    # Verify it's valid JSON
    try:
        log_entry = json.loads(output)
    except json.JSONDecodeError:
        pytest.fail(f"Output is not valid JSON: {output}")

    # Verify fields
    assert "timestamp" in log_entry
    assert "level" in log_entry
    assert log_entry["level"] == "INFO"
    assert "message" in log_entry
    assert log_entry["message"] == test_message
    assert "extra" in log_entry
    assert log_entry["extra"]["context"] == test_context
