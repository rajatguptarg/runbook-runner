# Technology Stack

## Backend
- **Language**: Python 3.11
- **Framework**: FastAPI with Uvicorn ASGI server
- **Database**: MongoDB with Beanie ODM (async)
- **Authentication**: API key-based with role-based access control
- **Validation**: Pydantic models for request/response validation
- **Logging**: Loguru for structured logging
- **Security**: Cryptography (Fernet) for credential encryption
- **Monitoring**: Prometheus FastAPI Instrumentator for metrics
- **Testing**: Pytest with pytest-asyncio, TestClient, mongomock

## Frontend
- **Framework**: React 19.1.0 with Create React App
- **Routing**: React Router DOM 7.7.0
- **HTTP Client**: Axios for API communication
- **UI Components**: React Bootstrap 2.10.10 with Bootstrap 5.3.7
- **Markdown**: React Markdown for rich text rendering
- **Drag & Drop**: React Beautiful DnD for block reordering
- **Testing**: React Testing Library with Jest

## Infrastructure
- **Containerization**: Docker with multi-service docker-compose setup
- **Database**: MongoDB with initialization scripts
- **Development**: Hot reload for both backend and frontend
- **Code Quality**: Pre-commit hooks with Ruff linting

## Common Commands

### Backend Development
```bash
# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install pre-commit hooks
pre-commit install

# Run development server
uvicorn app.main:app --reload

# Run tests
pytest
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (use legacy peer deps flag)
npm install --legacy-peer-deps

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Docker Development
```bash
# Run entire stack
docker-compose up --build

# Backend available at: http://localhost:8000
# Frontend available at: http://localhost:3000
# MongoDB available at: localhost:27017
```

### Environment Configuration
- Copy `.env.example` to `.env` for backend configuration
- Copy `frontend/.env.example` to `frontend/.env` for frontend configuration
- Generate SECRET_KEY with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
