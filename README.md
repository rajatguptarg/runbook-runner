# Runbook Studio

This is a web-based **Runbook Application** ("Runbook Studio") designed for SRE engineers, on-call engineers, and developers to author, manage, and execute operational runbooks. The application supports creating step-by-step instructions or executable blocks (shell commands, API calls, conditional checks, timers) to streamline incident containment and reduce MTTR.

The project specifications can be found in the `spec/` directory:
* **Requirements**: `spec/requirements.md`
* **Design & System Architecture**: `spec/design.md`
* **Tasks**: `spec/tasks.md`

## Key Features

- **Runbook Management**: Intuitive UI for creating, reading, updating, and deleting runbooks.
- **Versatile Block Types**:
    - **Instruction**: Simple markdown text for guidance.
    - **Command**: Shell commands that run on a designated host.
    - **API Call**: HTTP requests to external services using stored credentials.
    - **Conditional**: Branching logic based on the outcome of a check.
    - **Timer**: Pause execution for a specified interval.
- **Execution Engine**: Run steps sequentially and view real-time outputs in a console panel.
- **Execution Control**: Start, Pause, Resume, and Stop runbook execution.
- **Versioning**: Runbooks are versioned, allowing for rollbacks to any prior version.
- **Secure Credential Store**: Encrypted storage for API keys and other secrets.
- **Role-Based Access Control (RBAC)**: Enforces permissions at the API level.
- **Audit Logging & History**: Persists execution history, outputs, and a full audit trail for compliance.

## System Architecture

The system follows a 3-tier architecture:

```
┌──────────────┐      HTTPS/API      ┌───────────────┐      SQL      ┌─────────────┐
│  Browser UI  │ ──────────────────▶ │  FastAPI App  │ ◀──────────▶ │  Database   │
│   (React)    │                      │               │               │ (PostgreSQL)│
└──────────────┘                      └───────────────┘               └─────────────┘
                                                │
                                                ▼
                                        ┌────────────────┐
                                        │  Execution     │
                                        │  Engine Worker │
                                        └────────────────┘
```

- **Frontend**: A React Single Page Application (SPA) providing a user-friendly interface for runbook management and execution.
- **Backend**: A FastAPI application that exposes a REST API, handles business logic, and manages the execution engine.
- **Execution Engine**: A background worker that processes execution jobs, runs commands, and captures outputs.
- **Database**: A PostgreSQL database for persisting runbooks, versions, execution history, and encrypted credentials.

## Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLModel, Pydantic, Alembic
- **Frontend**: React, React Router, Axios
- **Database**: PostgreSQL
- **Logging**: Loguru
- **Testing**: Pytest, TestClient, Cypress/Playwright

## Development Setup

### Backend

1.  Create and activate a Python 3.13 virtual environment.
2.  Install dependencies:
    ```sh
    pip install fastapi "uvicorn[standard]" sqlmodel pydantic loguru alembic
    ```
3.  Set up environment variables for the PostgreSQL connection (e.g., in a `.env` file).
4.  Run database migrations using Alembic.

### Frontend

1.  Navigate to the `frontend/` directory (to be created).
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Start the development server:
    ```sh
    npm start
    ```

## API Endpoints

Authentication is handled via an `X-API-KEY` header.

- `GET /runbooks`: List all runbooks.
- `POST /runbooks`: Create a new runbook.
- `GET /runbooks/{id}`: Fetch a single runbook.
- `PUT /runbooks/{id}`: Update a runbook (creates a new version).
- `DELETE /runbooks/{id}`: Delete a runbook.
- `GET /runbooks/{id}/versions`: List all versions for a runbook.
- `POST /runbooks/{id}/execute`: Enqueue a new execution job.
- `GET /executions/{job_id}`: Get the status and output of an execution job.
- `POST /executions/{job_id}/control`: Pause, resume, or stop a job.
- `GET /credentials`: List credentials.
- `POST /credentials`: Create a new credential.
- `DELETE /credentials/{id}`: Delete a credential.

## Contributing

Please refer to `spec/tasks.md` for the planned implementation tasks. Contributions should align with the project's architecture and coding standards.

## License

This project is unlicensed.
