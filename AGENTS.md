# AGENTS.md

This file provides guidance to OpenAI Codex when working with code in this repository.

## Project Overview

This is a web-based **Runbook Application** ("Runbook Studio") designed for SRE engineers, on-call engineers, and developers to author, manage, and execute operational runbooks. The application supports creating step-by-step instructions or executable blocks (shell commands, API calls, conditional checks, timers) to streamline incident containment and reduce MTTR.

Key features include:
- **Markdown Support**: Descriptions and instructions are rendered as Markdown.
- **Tagging**: Organize runbooks with comma-separated tags.
- **Interactive Execution**: Run individual blocks directly from the editor, like a Jupyter notebook, with outputs displayed inline.
- **Execution History**: All executions, including single-block runs, are recorded.
- **Read-Only View**: A dedicated view mode prevents accidental edits.

The details are:
* **Requirements**: Can be found under `spec/requirements.md` file.
* **Design & System Architecture**: Can be found under `spec/design.md` file.
* **Tasks**: Can be found under `spec/tasks.md` file.

## Architecture

The system follows a 3-tier architecture:

1. **Frontend**: React SPA with components for RunbookList, RunbookEditor, and ExecutionViewer
2. **Backend**: FastAPI application with Beanie ODM and MongoDB database
3. **Execution Engine**: Background worker that processes execution jobs and runs commands

### Key Components

- **API Layer**: FastAPI with Pydantic validation and RBAC enforcement, with routers in `app/api`.
- **Execution Service**: Polls execution queue, runs steps, captures outputs. Resides in `app/services`.
- **Persistence Layer**: Beanie ODM with models defined in `app/models`.
- **Authentication**: API-key based with role-based access control in `app/security.py`.

## Data Models

Core entities include:
- **Runbook**: Title, description, metadata, and a list of `tags`.
- **RunbookVersion**: Versioned blocks with rollback capability.
- **Block**: A user-defined `name`, five types (instruction, command, api, condition, timer), and configuration.
- **ExecutionJob**: Tracks execution state and progress.
- **ExecutionStep**: Individual step outputs and status.
- **Credential**: Encrypted storage for API keys and SSH credentials.

## Development Setup

Since this is a new project without existing code, you'll need to:

1. **Backend Setup**:
   - Create Python 3.13 environment
   - Install FastAPI, Beanie, Pydantic, Loguru
   - Set up MongoDB connection via environment variables

2. **Frontend Setup**:
   - Initialize React application
   - Configure React Router and Axios
   - Set up drag-and-drop block editor

3. **Security**:
   - Implement API-key authentication via `X-API-KEY` header
   - Use Fernet encryption for credential secrets
   - Validate and sanitize shell commands to prevent injection

## Key API Endpoints

### Users

-   **POST** `/users/signup` - Create a new user account.
-   **POST** `/users/login` - Log in to get an API key.
-   **POST** `/users/logout` - Log out.

### Runbooks

-   **GET** `/runbooks` - List all runbooks.
-   **POST** `/runbooks` - Create a new runbook (accepts `tags`).
-   **GET** `/runbooks/{id}` - Fetch a single runbook.
-   **PUT** `/runbooks/{id}` - Update a runbook (accepts `tags`, creates a new version).
-   **DELETE** `/runbooks/{id}` - Delete a runbook.

### Versions

-   **GET** `/runbooks/{id}/versions` - List all versions for a runbook.

### Execution

-   **POST** `/blocks/execute` - Execute a single block and record it in the history.
-   **POST** `/runbooks/{id}/execute` - Enqueue a new execution job.
-   **GET** `/executions/{job_id}` - Get the status and output of an execution job (includes `block_name`).
-   **POST** `/executions/{job_id}/control` - Pause, resume, or stop a job.

### Credentials

-   **GET** `/credentials` - List credentials.
-   **POST** `/credentials` - Create a new credential.
-   **DELETE** `/credentials/{id}` - Delete a credential.

## Testing Strategy

- **Unit Tests**: Pydantic validation, block execution logic
- **Integration Tests**: FastAPI endpoints with TestClient
- **E2E Tests**: Full runbook creation and execution flow

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
