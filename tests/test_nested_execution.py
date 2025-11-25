# ruff: noqa: E402
import asyncio
import sys
from pathlib import Path
from unittest.mock import patch, AsyncMock
from uuid import uuid4

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from mongomock_motor import AsyncMongoMockClient
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

import app.db as db
from app.models import (
    ExecutionJob,
    Runbook,
    RunbookVersion,
    Block,
    ExecutionStep,
    Credential,
    ExecutionEnvironment
)
from app.services.execution import run_job, BlockExecutionResult

@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    # Use a consistent, valid Fernet key for tests
    monkeypatch.setattr(db, "AsyncIOMotorClient", AsyncMongoMockClient)
    monkeypatch.setenv("DB_USER", "u")
    monkeypatch.setenv("DB_PASSWORD", "p")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_NAME", "testdb")
    monkeypatch.setenv("SECRET_KEY", "870STvCfnd0oNi-TeWJM6986M9Rfm26zbnIgTOKwDLw=")

    # Initialize Beanie with the mock client and models
    # Connect to a mock MongoDB database
    client = AsyncMongoMockClient("mongodb://localhost:27017/")
    database = client["testdb"]
    
    async def init():
        await init_beanie(
            database=database,
            document_models=[Runbook, RunbookVersion, ExecutionJob, ExecutionStep, Credential, ExecutionEnvironment]
        )
    asyncio.run(init())

    yield

@pytest.mark.asyncio
async def test_nested_execution_success():
    # Setup
    runbook = Runbook(title="Nested Test", description="d", created_by=uuid4())
    await runbook.insert()

    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(
                type="condition",
                config={
                    "condition_type": "command_exit_code",
                    "check_command": "true",
                    "expected_exit_code": 0,
                    "nested_blocks": [
                        {
                            "type": "command",
                            "config": {"command": "echo 'nested'"},
                            "order": 1,
                            "id": str(uuid4())
                        }
                    ]
                },
                order=1,
            )
        ],
    )
    await version.insert()

    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # Mock
    with patch("app.services.execution.execute_command_block") as mock_exec:
        # 1. Condition check (success)
        # 2. Nested block execution (success)
        
        mock_exec.side_effect = [
            BlockExecutionResult(status="success", output="", exit_code=0), # Condition check
            BlockExecutionResult(status="success", output="nested", exit_code=0) # Nested command
        ]

        await run_job(job)

        updated_job = await ExecutionJob.get(job.id)
        assert updated_job.status == "completed"

        steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
        # Should have 2 steps: 1 for condition block, 1 for nested command
        assert len(steps) == 2
        assert "TRUE" in steps[0].output
        assert steps[1].output == "nested"

@pytest.mark.asyncio
async def test_nested_execution_skipped():
    # Setup
    runbook = Runbook(title="Nested Skip Test", description="d", created_by=uuid4())
    await runbook.insert()

    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(
                type="condition",
                config={
                    "condition_type": "command_exit_code",
                    "check_command": "false",
                    "expected_exit_code": 0,
                    "nested_blocks": [
                        {
                            "type": "command",
                            "config": {"command": "echo 'nested'"},
                            "order": 1,
                            "id": str(uuid4())
                        }
                    ]
                },
                order=1,
            )
        ],
    )
    await version.insert()

    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # Mock
    with patch("app.services.execution.execute_command_block") as mock_exec:
        mock_exec.side_effect = [
            BlockExecutionResult(status="error", output="", exit_code=1), # Condition check fails
        ]

        await run_job(job)

        updated_job = await ExecutionJob.get(job.id)
        assert updated_job.status == "completed" # Job succeeds even if condition is false (nested skipped)

        steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
        # Should have 1 step: Condition block (evaluated to false)
        assert len(steps) == 1
        assert "FALSE" in steps[0].output


@pytest.mark.asyncio
async def test_nested_execution_else_path():
    # Setup
    runbook = Runbook(title="Nested Else Test", description="d", created_by=uuid4())
    await runbook.insert()

    version = RunbookVersion(
        runbook_id=runbook.id,
        version_number=1,
        blocks=[
            Block(
                type="condition",
                config={
                    "condition_type": "command_exit_code",
                    "check_command": "false",
                    "expected_exit_code": 0,
                    "nested_blocks": [
                        {
                            "type": "command",
                            "config": {"command": "echo 'nested'"},
                            "order": 1,
                            "id": str(uuid4())
                        }
                    ],
                    "else_blocks": [
                        {
                            "type": "command",
                            "config": {"command": "echo 'else'"},
                            "order": 1,
                            "id": str(uuid4())
                        }
                    ]
                },
                order=1,
            )
        ],
    )
    await version.insert()

    job = ExecutionJob(runbook_id=runbook.id, version_id=version.id, status="pending")
    await job.insert()

    # Mock
    with patch("app.services.execution.execute_command_block") as mock_exec:
        # 1. Condition check (fails)
        # 2. Else block execution (success)
        
        mock_exec.side_effect = [
            BlockExecutionResult(status="success", output="", exit_code=1), # Condition check fails (exit code 1 != 0)
            BlockExecutionResult(status="success", output="else", exit_code=0) # Else command
        ]

        await run_job(job)

        updated_job = await ExecutionJob.get(job.id)
        assert updated_job.status == "completed"

        steps = await ExecutionStep.find(ExecutionStep.job_id == job.id).to_list()
        # Should have 2 steps: 1 for condition block, 1 for else command
        assert len(steps) == 2
        assert "FALSE" in steps[0].output
        assert steps[1].output == "else"
