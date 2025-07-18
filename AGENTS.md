# AGENTS.md

This file provides guidance to OpenAI Codex when working with code in this repository.

## Project Overview

This is a web-based **Runbook Application** ("Runbook Studio") designed for SRE engineers, on-call engineers, and developers to author, manage, and execute operational runbooks. The application supports creating step-by-step instructions or executable blocks (shell commands, API calls, conditional checks, timers) to streamline incident containment and reduce MTTR.

The details are:
* **Requirements**: Can be found under `spec/requirements.md` file.
* **Design & System Architecture**: Can be found under `spec/design.md` file.
* **Tasks**: Can be found under `spec/tasks.md` file.

## Architecture

The system follows a 3-tier architecture:

1. **Frontend**: React SPA with components for RunbookList, RunbookEditor, and ExecutionViewer
2. **Backend**: FastAPI application with SQLModel ORM and PostgreSQL database
3. **Execution Engine**: Background worker that processes execution jobs and runs commands

### Key Components

- **API Layer**: FastAPI with Pydantic validation and RBAC enforcement
- **Execution Service**: Polls execution queue, runs steps, captures outputs
- **Persistence Layer**: SQLModel ORM with PostgreSQL for runbooks, versions, executions, credentials
- **Authentication**: API-key based with role-based access control

## Data Models

Core entities include:
- **Runbook**: Title, description, metadata
- **RunbookVersion**: Versioned blocks with rollback capability
- **Block**: Five types - instruction, command, api, condition, timer
- **ExecutionJob**: Tracks execution state and progress
- **ExecutionStep**: Individual step outputs and status
- **Credential**: Encrypted storage for API keys and SSH credentials

## Development Setup

Since this is a new project without existing code, you'll need to:

1. **Backend Setup**:
   - Create Python 3.13 environment
   - Install FastAPI, SQLModel, Pydantic, Loguru
   - Set up PostgreSQL connection via environment variables
   - Configure Alembic for database migrations

2. **Frontend Setup**:
   - Initialize React application
   - Configure React Router and Axios
   - Set up drag-and-drop block editor

3. **Security**:
   - Implement API-key authentication via `X-API-KEY` header
   - Use Fernet encryption for credential secrets
   - Validate and sanitize shell commands to prevent injection

## Key API Endpoints

- `GET/POST/PUT/DELETE /runbooks` - Runbook CRUD operations
- `GET /runbooks/{id}/versions` - Version management
- `POST /runbooks/{id}/execute` - Enqueue execution job
- `GET/POST /executions/{job_id}` - Execution status and control
- `GET/POST/DELETE /credentials` - Credential management

## Testing Strategy

- **Unit Tests**: Pydantic validation, block execution logic
- **Integration Tests**: FastAPI endpoints with TestClient
- **E2E Tests**: Full runbook creation and execution flow

## Implementation Tasks

The project is organized into 21 implementation tasks covering:
- Backend infrastructure (Tasks 1-4)
- Core APIs (Tasks 5-7)
- Execution engine (Tasks 8-12)
- Audit logging (Task 13)
- Frontend components (Tasks 15-19)
- Testing and documentation (Tasks 20-21)

## Security Considerations

- All credentials encrypted at rest using Fernet
- Command sanitization to prevent shell injection
- User approval workflow before command execution
- RBAC enforcement at API level
- Audit logging for compliance (1-year retention)

## Monitoring & Observability

- Structured JSON logging with Loguru
- Prometheus metrics for API latency and execution durations
- Execution history and audit trails stored in database
