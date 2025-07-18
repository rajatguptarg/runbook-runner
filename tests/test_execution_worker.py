# ruff: noqa: E402
import asyncio
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import uuid4

import httpx
import pytest
from mongomock_motor import AsyncMongoMockClient

import app.db as db
from app.models import (
    ExecutionJob,
    Runbook,
    RunbookVersion,
    Block,
    ExecutionStep,
    Credential,
)
from app.services.execution import run_job
from app.security import encrypt_secret


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    monkeypatch.setattr(db, "AsyncIOMotorClient", AsyncMongoMockClient)
    monkeypatch.setenv("DB_USER", "u")
    monkeypatch.setenv("DB_PASSWORD", "p")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_NAME", "testdb")
    monkeypatch.setenv("SECRET_KEY", "870STvCfnd0oNi-TeWJM6986M9Rfm26zbnIgTOKwDLw=")
    yield


@pytest.mark.asyncio
async def test_run_job_success():
    # 1. Setup: Create a Runbook, Version, and Job
    runbook = Runbook(title="Test RB", description="d", created_by=uuid4())
    await runbook.insert()

    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(type="command", config={"command": "echo 'hello'"}, order=1),
            Block(type="command", config={"command": "echo 'world'"}, order=2),
        ],
    )
    await version.insert()

    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # 2. Mock the subprocess call
    with patch("asyncio.create_subprocess_shell") as mock_shell:
        # Configure the mock to simulate successful execution
        mock_proc = AsyncMock()
        mock_proc.communicate.return_value = (b"output", b"")
        mock_proc.returncode = 0
        mock_shell.return_value = mock_proc

        # 3. Run the job
        await run_job(job)

        # 4. Assertions
        # Check job status
        updated_job = await ExecutionJob.get(job.id)
        assert updated_job.status == "completed"

        # Check that two steps were created
        steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
        assert len(steps) == 2

        # Check details of the first step
        assert steps[0].status == "success"
        assert steps[0].exit_code == 0
        assert "output" in steps[0].output

        # Check that the command was called correctly
        mock_shell.assert_any_call(
            "echo 'hello'",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        mock_shell.assert_any_call(
            "echo 'world'",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )


@pytest.mark.asyncio
async def test_run_job_failure():
    # 1. Setup
    runbook = Runbook(title="Test RB Fail", description="d", created_by=uuid4())
    await runbook.insert()

    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(type="command", config={"command": "echo 'ok'"}, order=1),
            Block(type="command", config={"command": "exit 1"}, order=2),
            Block(type="command", config={"command": "echo 'never runs'"}, order=3),
        ],
    )
    await version.insert()

    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # 2. Mock subprocess
    with patch("asyncio.create_subprocess_shell") as mock_shell:
        # Simulate one success and one failure
        success_proc = AsyncMock()
        success_proc.communicate.return_value = (b"ok", b"")
        success_proc.returncode = 0

        fail_proc = AsyncMock()
        fail_proc.communicate.return_value = (b"", b"error")
        fail_proc.returncode = 1

        mock_shell.side_effect = [success_proc, fail_proc]

        # 3. Run job
        await run_job(job)

        # 4. Assertions
        updated_job = await ExecutionJob.get(job.id)
        assert updated_job.status == "failed"

        steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
        assert len(steps) == 2  # Should stop after failure

        assert steps[0].status == "success"
        assert steps[1].status == "error"
        assert steps[1].exit_code == 1
        assert "error" in steps[1].output

        # Ensure the third command was never run
        assert mock_shell.call_count == 2


@pytest.mark.asyncio
@patch("httpx.AsyncClient.request", new_callable=AsyncMock)
async def test_run_api_block_success(mock_request):
    # 1. Setup
    mock_request.return_value = httpx.Response(200, json={"status": "ok"})
    runbook = Runbook(title="API Test", description="d", created_by=uuid4())
    await runbook.insert()

    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(
                type="api",
                config={"method": "GET", "url": "https://example.com/api"},
                order=1,
            )
        ],
    )
    await version.insert()
    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # 2. Run job
    await run_job(job)

    # 3. Assertions
    updated_job = await ExecutionJob.get(job.id)
    assert updated_job.status == "completed"
    steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
    assert len(steps) == 1
    assert steps[0].status == "success"
    assert steps[0].exit_code == 200
    assert "Status: 200" in steps[0].output
    mock_request.assert_called_once()


@pytest.mark.asyncio
@patch("httpx.AsyncClient.request", new_callable=AsyncMock)
async def test_run_api_block_with_credential(mock_request):
    # 1. Setup
    mock_request.return_value = httpx.Response(200, json={"status": "ok"})
    cred = Credential(
        name="MyKey",
        type="api",
        encrypted_secret=encrypt_secret("my-secret-token"),
        created_by=uuid4(),
    )
    await cred.insert()

    runbook = Runbook(title="API Cred Test", description="d", created_by=uuid4())
    await runbook.insert()
    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(
                type="api",
                config={
                    "method": "GET",
                    "url": "https://example.com/api",
                    "credential_id": str(cred.id),
                },
                order=1,
            )
        ],
    )
    await version.insert()
    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # 2. Run job
    await run_job(job)

    # 3. Assertions
    updated_job = await ExecutionJob.get(job.id)
    assert updated_job.status == "completed"
    # Check that the header was added
    mock_request.assert_called_once()
    call_kwargs = mock_request.call_args.kwargs
    assert "headers" in call_kwargs
    assert call_kwargs["headers"]["Authorization"] == "Bearer my-secret-token"


@pytest.mark.asyncio
async def test_run_condition_block_true():
    # 1. Setup
    runbook = Runbook(title="Cond Test", description="d", created_by=uuid4())
    await runbook.insert()
    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(
                type="condition",
                config={"type": "command", "command": "exit 0"},
                order=1,
            ),
            Block(type="command", config={"command": "echo 'was true'"}, order=2),
        ],
    )
    await version.insert()
    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # 2. Mock subprocess
    with patch("asyncio.create_subprocess_shell") as mock_shell:
        mock_shell.return_value.communicate.return_value = (b"", b"")
        mock_shell.return_value.returncode = 0

        # 3. Run job
        await run_job(job)

        # 4. Assertions
        updated_job = await ExecutionJob.get(job.id)
        assert updated_job.status == "completed"
        steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
        assert len(steps) == 2
        assert mock_shell.call_count == 2


@pytest.mark.asyncio
async def test_run_condition_block_false():
    # 1. Setup
    runbook = Runbook(title="Cond Test False", description="d", created_by=uuid4())
    await runbook.insert()
    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(
                type="condition",
                config={"type": "command", "command": "exit 1"},
                order=1,
            ),
            Block(type="command", config={"command": "echo 'never runs'"}, order=2),
        ],
    )
    await version.insert()
    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # 2. Mock subprocess
    with patch("asyncio.create_subprocess_shell") as mock_shell:
        mock_shell.return_value.communicate.return_value = (b"", b"")
        mock_shell.return_value.returncode = 1

        # 3. Run job
        await run_job(job)

        # 4. Assertions
        updated_job = await ExecutionJob.get(job.id)
        assert updated_job.status == "failed"
        steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
        assert len(steps) == 1  # Fails on the condition
        assert mock_shell.call_count == 1


@pytest.mark.asyncio
@patch("asyncio.sleep", new_callable=AsyncMock)
async def test_run_timer_block(mock_sleep):
    # 1. Setup
    runbook = Runbook(title="Timer Test", description="d", created_by=uuid4())
    await runbook.insert()
    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[Block(type="timer", config={"duration": 5}, order=1)],
    )
    await version.insert()
    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # 2. Run job
    await run_job(job)

    # 3. Assertions
    updated_job = await ExecutionJob.get(job.id)
    assert updated_job.status == "completed"
    steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
    assert len(steps) == 1
    assert steps[0].status == "success"
    assert "Pausing for 5 seconds" in steps[0].output
    mock_sleep.assert_called_once_with(5)
