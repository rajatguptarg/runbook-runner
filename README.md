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
┌──────────────┐      HTTPS/API      ┌───────────────┐           ┌─────────────┐
│  Browser UI  │ ──────────────────▶ │  FastAPI App  │ ◀──────────▶ │  Database   │
│   (React)    │                      │               │               │  (MongoDB)  │
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
- **Database**: A MongoDB database for persisting runbooks, versions, execution history, and encrypted credentials.

## Tech Stack

- **Backend**: Python 3.11, FastAPI, Beanie, Pydantic
- **Frontend**: React, React Router, Axios
- **Database**: MongoDB
- **Logging**: Loguru
- **Testing**: Pytest, TestClient, Cypress/Playwright

## Development Setup

1.  Create and activate a Python virtual environment:
    ```sh
    python3 -m venv .venv
    source .venv/bin/activate
    ```
2.  Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```
3.  Install pre-commit hooks:
    ```sh
    pre-commit install
    ```
4.  Copy `.env.example` to `.env` and configure the connection settings. The file defines the following values:
    - `DB_USER` and `DB_PASSWORD` – credentials for the database.
    - `DB_HOST` – MongoDB host (defaults to `localhost` if omitted).
    - `DB_NAME` – name of the database.
    - `DB_CONNECTION` – optional full connection string containing the username, password, and host. If provided, this overrides the individual settings.
5.  Run the application:
    ```sh
    uvicorn app.main:app --reload
    ```
6.  The application initializes its MongoDB database on startup.

## Testing

To run the test suite, use `pytest`:
```sh
pytest
```

## API Endpoints

Authentication is handled via an `X-API-KEY` header. Users obtain an API key by signing up and logging in. API keys and user roles are stored in the MongoDB database.

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

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
