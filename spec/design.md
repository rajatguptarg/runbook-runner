**Runbook Application Technical Design**

---

## 1. System Architecture Overview

**Diagram:**

```
┌──────────────┐      HTTPS/API      ┌───────────────┐           ┌─────────────┐
│  Browser UI  │ ──────────────────▶ │  FastAPI App  │ ◀──────────▶ │  Database   │
│ (React/Vue)  │                      │               │               │  (MongoDB)  │
└──────────────┘                      └───────────────┘               └─────────────┘
        │                                       │
        │ WebSocket Polling (REST Polling)      │
        │                                       ▼
        │                               ┌────────────────┐
        │                               │  Execution     │
        │                               │  Engine Worker │
        │                               └────────────────┘
        │                                       │
        │                                 Local Shell
        │                                       │
        │                              ┌────────────────┐
        │                              │  Credential    │
        │                              │  Vault / Store │
        │                              └────────────────┘
        │
        ▼
 Frontend Components
```

* The **Browser UI** (built with React) communicates via HTTPS to the FastAPI backend.
* The **FastAPI App** handles authentication, CRUD operations, and dispatching executions.
* An **Execution Engine Worker** (separate process/module) pulls pending execution jobs, runs shell commands or API calls, and writes outputs back to the database.
* **MongoDB** stores runbook definitions, versions, user data, credentials (encrypted), and execution logs.
* **Credential Vault**: a secure collection in the database encrypted by an application-managed key; accessible only via FastAPI with RBAC.

---

## 2. Component Breakdown

| Component            | Responsibility                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| API Layer (FastAPI)  | Exposes REST endpoints for runbook CRUD, execution control, credentials, and history. Implements RBAC and input validation via Pydantic. |
| Execution Service    | Polls execution queue, runs steps, captures stdout/stderr/exit codes, updates status.                                                    |
| Persistence Layer    | Beanie ODM mapping of Runbook, Version, Block, Execution, Credential models to MongoDB documents.                                     |
| Auth & RBAC          | API-key–based authentication; roles enforced at endpoint level.                                                                          |
| Frontend App         | React SPA with components: RunbookList, RunbookEditor, ExecutionViewer. Communicates with backend via Axios.                             |
| Logging & Monitoring | Loguru for structured logs; metrics exported (via Prometheus client) for uptime and execution durations.                                 |

---

## 3. Data Models & Schemas

```python
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime
from typing_extensions import Literal

class Runbook(Document):
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: str
    created_by: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "runbooks"

class RunbookVersion(Document):
    id: UUID = Field(default_factory=uuid4)
    runbook_id: Indexed(UUID)
    version_number: int
    blocks: List['Block']  # Embedded documents
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "runbook_versions"

class Block(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: Literal['instruction','command','api','condition','timer']
    config: Dict[str, Any]
    order: int

class ExecutionJob(Document):
    id: UUID = Field(default_factory=uuid4)
    version_id: Indexed(UUID)
    status: Literal['pending','running','completed','failed']
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None

    class Settings:
        name = "execution_jobs"

class ExecutionStep(Document):
    id: UUID = Field(default_factory=uuid4)
    job_id: Indexed(UUID)
    block_id: UUID
    status: Literal['pending','running','success','error']
    output: str  # stdout+stderr
    exit_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "execution_steps"

class Credential(Document):
    id: UUID = Field(default_factory=uuid4)
    name: str
    type: Literal['ssh','api']
    encrypted_secret: str
    created_by: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "credentials"
```

---

## 4. API Specifications

### Authentication

* **Header:** `X-API-KEY: <key>`
* **Response on missing/invalid key:** `401 Unauthorized`

### Endpoints

#### Users

* `POST /users/signup` – Create a new user account.
* `POST /users/login` – Log in to get an API key.
* `POST /users/logout` – Log out.

#### Runbooks

* `GET /runbooks` – List runbooks
* `POST /runbooks` – Create runbook
* `GET /runbooks/{id}` – Fetch single runbook
* `PUT /runbooks/{id}` – Update runbook (new version created)
* `DELETE /runbooks/{id}` – Delete runbook

#### Versions

* `GET /runbooks/{id}/versions` – List versions
* `POST /runbooks/{id}/versions/{version_id}/rollback` – Roll back to version

#### Execution

* `POST /runbooks/{id}/execute` – Enqueue execution job (body: optional step range)
* `GET /executions/{job_id}` – Get job status and step outputs
* `POST /executions/{job_id}/control` – Pause/Resume/Stop

#### Credentials

* `GET /credentials` – List credentials
* `POST /credentials` – Create credential
* `DELETE /credentials/{id}` – Delete credential

---

## 5. Security Design

* **Encryption:** Use Fernet (symmetric) to encrypt credential secrets before storage. Key stored in environment variable.
* **Command Sanitization:** Validate and disallow dangerous shell operators (e.g. `>` outside expected contexts).
* **Approval Workflow:** Before running each command, API returns a confirmation-required status; frontend prompts user to confirm.

---

## 6. Error Handling & Recovery

* **Retries:** Transient failures in API calls retried up to 3 times with exponential backoff.
* **Circuit Breaker:** For downstream service unavailability, short-circuit additional calls.
* **Logging:** All errors logged with context; stack traces from FastAPI.

---

## 7. Monitoring & Observability

* **Metrics:** Expose Prometheus endpoints for:

  * API request counts and latencies
  * Execution durations per block type
  * Success/failure rates
* **Logging:** Loguru writes JSON logs to stdout; centralized log aggregator (e.g. ELK).

---

## 8. Testing Strategy

* **Unit Tests:** Pydantic model validation, individual block execution logic.
* **Integration Tests**: FastAPI endpoints with TestClient; mock MongoDB (e.g., using `mongomock`).
* **E2E Tests:** Simulate runbook creation and execution using a Dockerized local shell environment.

*End of Technical Design Document.*
