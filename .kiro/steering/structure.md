# Project Structure

## Root Directory Layout

```
runbook-studio/
├── app/                    # Backend FastAPI application
├── frontend/               # React frontend application
├── tests/                  # Backend test suite
├── spec/                   # Project specifications and documentation
├── scripts/                # Utility scripts
├── design/                 # UI/UX design assets
├── .kiro/                  # Kiro IDE configuration and steering
├── docker-compose.yml      # Multi-service Docker setup
├── Dockerfile             # Backend container definition
├── requirements.txt       # Python dependencies
└── mongo-init.js          # MongoDB initialization script
```

## Backend Structure (`app/`)

```
app/
├── __init__.py
├── main.py                # FastAPI application entry point
├── db.py                  # Database connection and initialization
├── security.py            # Authentication and RBAC utilities
├── logging_config.py      # Loguru logging configuration
├── api/                   # API route handlers
│   ├── users.py           # User management endpoints
│   ├── runbooks.py        # Runbook CRUD endpoints
│   ├── versions.py        # Version management endpoints
│   ├── credentials.py     # Credential management endpoints
│   ├── execution.py       # Execution control endpoints
│   └── audit.py           # Audit logging endpoints
├── models/                # Beanie document models
│   ├── user.py            # User model
│   ├── runbook.py         # Runbook and Block models
│   ├── execution.py       # Execution job and step models
│   ├── credential.py      # Credential model
│   └── audit.py           # Audit log model
└── services/              # Business logic services
    ├── execution.py       # Execution engine worker
    └── audit.py           # Audit logging service
```

## Frontend Structure (`frontend/src/`)

```
frontend/src/
├── App.js                 # Main application component
├── index.js               # React application entry point
├── components/            # Reusable UI components
│   ├── Block.js           # Individual runbook block component
│   ├── EditBlockModal.js  # Block editing modal
│   ├── Header.js          # Application header/navigation
│   └── ProtectedRoute.js  # Route protection wrapper
├── pages/                 # Page-level components
│   ├── LoginPage.js       # Authentication page
│   ├── RunbookList.js     # Runbook listing page
│   ├── RunbookCreate.js   # Runbook creation page
│   ├── RunbookEditor.js   # Runbook editing interface
│   ├── RunbookViewer.js   # Runbook viewing/execution page
│   ├── ExecutionViewer.js # Execution status and output viewer
│   ├── ExecutionHistoryPage.js # Execution history listing
│   ├── CredentialsPage.js # Credential management page
│   └── AuditHistoryPage.js # Audit log viewer
└── services/
    └── api.js             # Axios API client configuration
```

## Architecture Patterns

### Backend Patterns
- **Layered Architecture**: API → Services → Models → Database
- **Dependency Injection**: Database initialization via lifespan events
- **Repository Pattern**: Beanie ODM provides document-based data access
- **Background Workers**: Async execution engine using asyncio tasks
- **Middleware**: CORS, authentication, and monitoring middleware

### Frontend Patterns
- **Component-Based Architecture**: Reusable React components
- **Page-Based Routing**: React Router for navigation
- **Service Layer**: Centralized API communication via Axios
- **Protected Routes**: Authentication-based route access control
- **Modal Patterns**: Overlay components for editing operations

### Data Flow
- **API-First**: Frontend communicates exclusively via REST API
- **Async Operations**: Background execution with polling for status updates
- **Event-Driven**: Execution engine processes jobs from queue
- **Audit Trail**: All operations logged for compliance and debugging

## File Naming Conventions

### Backend (Python)
- **Modules**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions/Variables**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`

### Frontend (JavaScript)
- **Components**: `PascalCase.js`
- **Pages**: `PascalCase.js` with descriptive suffixes
- **Services**: `camelCase.js`
- **Variables/Functions**: `camelCase`

## Testing Structure
- **Backend Tests**: Mirror `app/` structure in `tests/`
- **Frontend Tests**: Co-located with components or in `__tests__/` directories
- **Integration Tests**: End-to-end scenarios testing API and UI together
