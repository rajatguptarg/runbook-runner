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

## Project Status

This project is under active development. The backend API is functionally complete, and the frontend is in progress.

**Implemented Features:**
*   **Backend:**
    *   User authentication and authorization (API Key-based).
    *   Complete CRUD operations for Runbooks, Versions, and Credentials.
    *   Secure credential storage with encryption at rest.
    *   An execution engine that processes runbook blocks, including commands, API calls, conditionals, and timers.
    *   API endpoints for enqueuing, monitoring, and stopping executions.
    *   Comprehensive audit logging for all state-changing operations.
    *   Structured JSON logging and a Prometheus metrics endpoint (`/metrics`).
*   **Frontend:**
    *   Project scaffolded with Create React App, including routing and API service configuration.
    *   A Runbook List page that successfully fetches and displays runbooks from the backend API.

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
    npm install
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

### Users

-   **POST** `/users/signup`
    -   **Description**: Create a new user account.
    -   **Body**: `SignupRequest`
        -   `username` (str): The desired username.
        -   `password` (str): The desired password.
        -   `role` (str, optional): The user's role (e.g., "developer", "sre"). Defaults to "developer".
    -   **Response**: `SignupResponse` with a new `api_key`.

-   **POST** `/users/login`
    -   **Description**: Log in to get an API key.
    -   **Body**: `LoginRequest`
        -   `username` (str): The username.
        -   `password` (str): The password.
    -   **Response**: `LoginResponse` with the user's `api_key`.

-   **POST** `/users/logout`
    -   **Description**: Log out (conceptually, as API keys are stateless).
    -   **Authentication**: Required.
    -   **Response**: `LogoutResponse`.

### Runbooks

-   **GET** `/runbooks`
    -   **Description**: List all runbooks, returning the latest version of each.
    -   **Authentication**: Required.
    -   **Response**: A list of `RunbookRead` objects.

-   **POST** `/runbooks`
    -   **Description**: Create a new runbook. This also creates the first version.
    -   **Authentication**: Required.
    -   **Body**: `RunbookCreate`
        -   `title` (str): The runbook title.
        -   `description` (str): The runbook description.
        -   `blocks` (List[Block], optional): A list of blocks to initialize the runbook with.
    -   **Response**: `RunbookRead` object for the newly created runbook.

-   **GET** `/runbooks/{id}`
    -   **Description**: Fetch a single runbook by its ID, including the blocks from its latest version.
    -   **Authentication**: Required.
    -   **Response**: `RunbookRead` object.

-   **PUT** `/runbooks/{id}`
    -   **Description**: Update a runbook's metadata and blocks. This creates a new version.
    -   **Authentication**: Required.
    -   **Body**: `RunbookUpdate`
        -   `title` (str): The updated title.
        -   `description` (str): The updated description.
        -   `blocks` (List[Block]): The new list of blocks for the new version.
    -   **Response**: `RunbookRead` object reflecting the updated runbook and new version.

-   **DELETE** `/runbooks/{id}`
    -   **Description**: Delete a runbook and all of its associated versions.
    -   **Authentication**: Required.
    -   **Response**: `204 No Content`.

### Versions

-   **GET** `/runbooks/{id}/versions`
    -   **Description**: List all historical versions for a specific runbook.
    -   **Authentication**: Required.
    -   **Response**: A list of `RunbookRead` objects, each representing a version.

-   **POST** `/runbooks/{id}/versions/{version_number}/rollback`
    -   **Description**: Roll back to a specific version. This creates a new version with the content of the target version.
    -   **Authentication**: Required.
    -   **Response**: `RunbookRead` object for the newly created version.

### Execution

-   **POST** `/runbooks/{id}/execute`
    -   **Description**: Enqueue a new execution job for the latest version of a runbook.
    -   **Authentication**: Required.
    -   **Response**: `ExecutionResponse` with the `job_id` of the created job.

-   **GET** `/executions/{job_id}`
    -   **Description**: Get the status and all step outputs for a specific execution job.
    -   **Authentication**: Required.
    -   **Response**: `ExecutionStatusResponse` object containing `job_id`, `status`, and a list of `ExecutionStep` objects.

-   **POST** `/executions/{job_id}/control`
    -   **Description**: Send a control command to a job. Currently, only "stop" is supported.
    -   **Authentication**: Required.
    -   **Body**: `ControlRequest`
        -   `action` (str): The action to perform (e.g., "stop").
    -   **Response**: `202 Accepted` on success.

### Credentials

-   **GET** `/credentials`
    -   **Description**: List all credentials.
    -   **Authentication**: Required (restricted to "sre" role).
    -   **Response**: A list of `CredentialRead` objects (excluding the secret).

-   **POST** `/credentials`
    -   **Description**: Create a new credential. The secret will be encrypted at rest.
    -   **Authentication**: Required (restricted to "sre" role).
    -   **Body**: `CredentialCreate`
        -   `name` (str): A user-friendly name for the credential.
        -   `type` (str): The type of credential, either "ssh" or "api".
        -   `secret` (str): The secret value to be stored.
    -   **Response**: `CredentialRead` object for the newly created credential.

-   **DELETE** `/credentials/{id}`
    -   **Description**: Delete a credential by its ID.
    -   **Authentication**: Required (restricted to "sre" role).
    -   **Response**: `204 No Content`.


## Contributing

Please refer to `spec/tasks.md` for the planned implementation tasks. Contributions should align with the project's architecture and coding standards.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---
*Last Updated: 2025-07-18*
