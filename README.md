# Runbook Studio

This is a web-based **Runbook Application** ("Runbook Studio") designed for SRE engineers, on-call engineers, and developers to author, manage, and execute operational runbooks. The application supports creating step-by-step instructions or executable blocks (shell commands, API calls, conditional checks, timers) to streamline incident containment and reduce MTTR.

The project specifications can be found in the `spec/` directory:
* **Requirements**: `spec/requirements.md`
* **Design & System Architecture**: `spec/design.md`
* **Tasks**: `spec/tasks.md`

## Key Features

- **Runbook Management**: Intuitive UI for creating, viewing, updating, and deleting runbooks.
- **Interactive Block Execution**: Run command and API blocks individually from the editor, with output displayed inline, similar to a Jupyter notebook.
- **Markdown Support**: Use Markdown for rich text formatting in runbook descriptions and instruction blocks.
- **Tagging**: Organize runbooks with comma-separated tags for easy filtering and identification.
- **Versatile Block Types**:
    - **Instruction**: Simple markdown text for guidance.
    - **Command**: Shell commands that run on a designated host.
    - **API Call**: HTTP requests to external services using stored credentials with custom headers.
    - **Conditional**: Branching logic based on the outcome of a check.
    - **Timer**: Pause execution for a specified interval.
- **Execution Engine**: Run entire runbooks sequentially and view real-time outputs.
- **Versioning**: Runbooks are versioned, allowing for rollbacks to any prior version.
- **Secure Credential Store**: Encrypted storage for API keys and other secrets.
- **Role-Based Access Control (RBAC)**: Enforces permissions at the API level.
- **Audit Logging & History**: Persists execution history for both full runs and single-block executions.

## System Architecture

The system follows a 3-tier architecture:

```
┌──────────────┐      HTTPS/API       ┌───────────────┐               ┌─────────────┐
│  Browser UI  │ ──────────────────▶  │  FastAPI App  │ ◀──────────▶  │  Database   │
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
- **Execution Engine**: A background worker that processes full execution jobs, runs commands, and captures outputs.
- **Database**: A MongoDB database for persisting runbooks, versions, execution history, and encrypted credentials.

## Tech Stack

- **Backend**: Python 3.11, FastAPI, Beanie, Pydantic
- **Frontend**: React, React Router, Axios, React Markdown
- **Database**: MongoDB
- **Logging**: Loguru
- **Testing**: Pytest, TestClient

## Development Setup

### Backend

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
    - `SECRET_KEY` – a secret key for encrypting credentials, generated with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
5.  Run the application:
    ```sh
    uvicorn app.main:app --reload
    ```
6.  The application initializes its MongoDB database on startup.

### Frontend

1.  Navigate to the `frontend` directory:
    ```sh
    cd frontend
    ```
2.  Create a `.env` file by copying the example:
    ```sh
    cp .env.example .env
    ```
3.  (Optional) Modify the `REACT_APP_API_BASE_URL` in the `.env` file if your backend is running on a different URL.
4.  Install dependencies:
    ```sh
    npm install --legacy-peer-deps
    ```
5.  Start the development server:
    ```sh
    npm start
    ```
    The application will be available at `http://localhost:3000`.

## Docker

To run the entire application stack (backend, frontend, and database) using Docker, use the following command:
```sh
docker-compose up --build
```
- The backend will be available at `http://localhost:8000`.
- The frontend will be available at `http://localhost:3000`.

## Testing

### Backend

To run the backend test suite, use `pytest`:
```sh
pytest
```

### Frontend

To run the frontend tests, navigate to the `frontend` directory and run:
```sh
npm test
```

## API Documentation

Authentication is handled via an `X-API-KEY` header. Users can obtain an API key by signing up and then logging in.

**For interactive API documentation (Swagger UI), run the backend and navigate to [`http://localhost:8000/docs`](http://localhost:8000/docs).**

A Postman collection is also available at `postman_collection.json`.

### Example Workflows

#### 1. Create and Run a Runbook

1.  **Sign Up**: `POST /users/signup` with a username and password to get an API key.
2.  **Create Runbook**: `POST /runbooks` with your API key in the `X-API-KEY` header. Include a title, description, tags, and an array of blocks.
3.  **Execute Runbook**: `POST /runbooks/{id}/execute` to start a full execution job.
4.  **Check Status**: `GET /executions/{job_id}` to see the status and step outputs.

#### 2. Create a Credential and Use It in a Block

1.  **Create Credential**: `POST /credentials` (requires "sre" role) with a name, type ("api"), and the secret token.
2.  **Update Runbook**: `PUT /runbooks/{id}` to update a runbook. In the `blocks` array, add an API block and set `config.credential_id` to the ID of the credential you just created. You can also set `config.auth_header_name`.
3.  **Execute Single Block**: `POST /blocks/execute` with the block's JSON definition and the `runbook_id` to test it. The execution will appear in the main execution history.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---
*Last Updated: 2025-07-18*
