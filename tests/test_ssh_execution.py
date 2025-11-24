import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from uuid import uuid4
from app.models.block import Block
from app.services.execution import execute_ssh_block
from app.models.credential import Credential

@pytest.mark.asyncio
async def test_execute_ssh_block_success():
    # Mock block
    block = Block(
        id=uuid4(),
        type="ssh",
        config={
            "host": "example.com",
            "username": "user",
            "command": "echo hello",
            "credential_id": str(uuid4())
        },
        order=1
    )

    # Mock Credential
    mock_cred = MagicMock(spec=Credential)
    mock_cred.type = "ssh"
    mock_cred.encrypted_secret = "secret"

    # Mock asyncssh
    mock_conn = MagicMock()
    mock_result = MagicMock()
    mock_result.exit_status = 0
    mock_result.stdout = "hello\n"
    mock_result.stderr = ""

    # Setup async context manager for connect
    mock_conn_ctx = AsyncMock()
    mock_conn_ctx.__aenter__.return_value = mock_conn
    mock_conn_ctx.__aexit__.return_value = None

    # Setup run method
    mock_conn.run = AsyncMock(return_value=mock_result)

    with patch("app.models.credential.Credential.get", new_callable=AsyncMock) as mock_get_cred, \
         patch("app.services.execution.decrypt_secret", return_value="private_key"), \
         patch("asyncssh.import_private_key"), \
         patch("asyncssh.connect", return_value=mock_conn_ctx) as mock_connect:

        mock_get_cred.return_value = mock_cred

        result = await execute_ssh_block(block)

        assert result.status == "success"
        assert result.output == "hello"
        assert result.exit_code == 0

        mock_connect.assert_called_once()
        mock_conn.run.assert_called_once_with("echo hello")

@pytest.mark.asyncio
async def test_execute_ssh_block_missing_config():
    block = Block(
        id=uuid4(),
        type="ssh",
        config={},
        order=1
    )

    result = await execute_ssh_block(block)

    assert result.status == "error"
    assert "missing host" in result.output

@pytest.mark.asyncio
async def test_execute_ssh_block_connection_error():
    block = Block(
        id=uuid4(),
        type="ssh",
        config={
            "host": "example.com",
            "username": "user",
            "command": "echo hello"
        },
        order=1
    )

    with patch("asyncssh.connect", side_effect=Exception("Connection failed")):
        result = await execute_ssh_block(block)

        assert result.status == "error"
        assert "Connection failed" in result.output
