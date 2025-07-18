**Runbook Application Requirements**

---

### 1. Introduction

This document captures the detailed requirements for a web-based Runbook application (“Runbook Studio”) that enables SRE and on-call engineers, as well as developers, to author, manage, and execute operational runbooks. It supports creating step-by-step instructions or executable blocks (shell commands, API calls, conditional checks, timers) to streamline incident containment and reduce Mean Time To Recovery (MTTR).

**Goals:**

* Provide an intuitive UI for CRUD operations on runbooks
* Execute commands and API calls securely on the user’s local machine or remote services
* Display real-time or near-real-time outputs in a scrollable, fixed-width console panel
* Persist execution history, outputs, exit codes, and audit logs for compliance and analysis
* Offer versioning for runbook content

**Stakeholders:**

* Site Reliability Engineers (SREs)
* On-call Engineers
* Developers
* Operations Managers

---

### 2. Users & Personas

**SRE / On-call Engineer**

* **Goals:** Quickly follow runbook steps to contain incidents and restore service.
* **Pain Points:** Outdated or unclear runbooks; slow context-switching between docs and terminals.

**Developer**

* **Goals:** Automate routine maintenance and deployments.
* **Pain Points:** Repetitive manual commands; lack of centralized, executable runbook repository.

---

### 3. Functional Requirements

**F1. Runbook Management (CRUD)**

* **F1.1 Create Runbook:** Users can define a title, description, and an ordered sequence of blocks (Instruction, Command, API Call, Condition, Timer).
* **F1.2 Read/List Runbooks:** Display a list of existing runbooks with title, description, last modified date, and actions (Edit, Delete, Execute).
* **F1.3 Update Runbook:** Users can modify runbook metadata and reorder, edit, add, or remove blocks.
* **F1.4 Delete Runbook:** Users can remove a runbook after confirmation.
* **Acceptance Criteria:** Each operation succeeds via REST endpoints; UI reflects changes immediately.

**F2. Block Types**

* **F2.1 Instruction Block:** Simple markdown text for guidance (no execution).
* **F2.2 Command Block:** Shell command (including docker, kubectl, scripts) that runs on a designated host.
* **F2.3 API Call Block:** HTTP request to external services; user selects stored credentials.
* **F2.4 Conditional Block:** Evaluate a boolean condition (e.g., file exists, health-check) and branch or pause execution.
* **F2.5 Timer Block:** Pause execution for a specified interval.
* **Acceptance Criteria:** All block types render correctly in editor and execute as designed.

**F3. Execution Engine**

* **F3.1 Sequential Execution:** Run selected steps or entire runbook in order.
* **F3.2 Output Panel:** For each Command/API block, display a fixed-width, scrollable console showing stdout, stderr, and exit code immediately below the block.
* **F3.3 Controls:** Start, Pause, Resume, and Stop execution.
* **Acceptance Criteria:** Outputs refresh automatically (batch polling) and reflect actual command status.

**F4. Versioning**

* **F4.1 Runbook Versions:** Maintain historical versions; allow rollback to any prior version.
* **Acceptance Criteria:** UI shows version history; user can revert.

**F5. Credentials & Configuration**

* **F5.1 Credential Store:** Securely save API credentials and SSH keys in the application.
* **F5.2 Association:** Users can attach credentials to API Call blocks or command blocks as needed.
* **Acceptance Criteria:** Tokens/keys encrypted at rest; only privileged roles can manage credentials.

**F6. Role-Based Access Control (RBAC)**

* **F6.1 Roles:** At minimum, SRE and Developer roles have Create/Edit/Delete/Execute rights.
* **F6.2 Enforcement:** Backend enforces permissions on all API endpoints.
* **Acceptance Criteria:** Unauthorized attempts return HTTP 403.

**F7. Audit Logging & History**

* **F7.1 Execution Logs:** Store timestamp, user, runbook ID, step outputs, exit codes.
* **F7.2 Audit Trail:** Log create/edit/delete actions on runbooks and credentials.
* **Acceptance Criteria:** Logs queryable via API; UI shows execution history.

---

### 4. Non-Functional Requirements

**N1. Performance & Scalability**

* Support \~50 runbook executions per day with low latency.
* Batch-polling interval configurable (e.g., every 2s).

**N2. Security**

* Encrypt credentials at rest; use HTTPS for all API traffic.
* Sanitize command inputs; confirm user approval before executing arbitrary commands.

**N3. Reliability & Availability**

* 99.9% uptime target for backend APIs.
* Graceful error handling and retry logic for transient failures.

**N4. Usability**

* Intuitive drag-and-drop editor for blocks.
* Accessible via keyboard navigation; support screen readers.

**N5. Maintainability**

* Codebase structured with FastAPI, Pydantic models, SQLModel ORM, and Loguru logging.
* Comprehensive unit and integration tests.

**N6. Compliance**

* Retain audit logs for 1 year; configurable retention policy.

---

### 5. Out of Scope

* Real-time streaming via WebSockets (batch polling only).
* Multi-tenant separation; single-organization scope.
* Mobile-specific UI.

---

### 6. Assumptions & Dependencies

* Users authenticate via API key header (`X-API-KEY`).
* Backend hosted on environment with shell access to target hosts.
* PostgreSQL (or compatible) database for persistence.
* No existing runbook/versioning system in place.

---

*End of Requirements Document.*
