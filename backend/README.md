# Marlow Dental — Backend API

> See ../AGENTS.md for the permanent, project-wide rules that apply here too — this file adds backend-specific detail on top of those, it does not replace them.

Lightweight, production-ready FastAPI service handling appointment requests for Marlow Dental. Built strictly following Domain-Driven Design, the Repository Pattern, and permanent project engineering principles (KISS, YAGNI, DRY, SOLID, PHI-Safe Logging).

---

## 1. Architecture & Dependency Direction

The service enforces a one-way dependency rule:

```text
API (Routes & DTOs)
       ↓
Application Service
       ↓
Domain Repository (Abstract Protocol/ABC)
       ↓
PostgreSQL Repository (SQLAlchemy 2.0 Async + asyncpg)
       ↓
PostgreSQL Database ("marlow_dental_dev" / "appointments" table)
```

- **Domain isolation**: The domain layer (`domain/models/`, `domain/repositories/`) is pure Python dataclasses and enums with zero imports of FastAPI or SQLAlchemy.
- **Relational schema**: The single `appointments` table uses flat, constrained relational columns (UUID primary key, unique confirmation ID, indexed status and preferred date).
- **PHI-Safe Logging**: Patient name, telephone, email, symptoms/notes, and insurance providers are strictly excluded from logs, error payloads, and HTTP responses.

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── main.py                     # FastAPI application factory, lifespan, CORS, rate limiting
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings (.env configuration)
│   │   ├── database.py             # Async engine & session lifecycle (startup/shutdown)
│   │   └── logging.py              # PHI-safe logger configuration (SQL echo disabled)
│   ├── domain/
│   │   ├── models/
│   │   │   └── appointment.py      # Pure domain entity & AppointmentStatus enum
│   │   └── repositories/
│   │       └── appointment_repo.py # Abstract repository interface (Protocol/ABC)
│   ├── application/
│   │   ├── dtos/
│   │   │   └── appointment_dto.py  # Pydantic request/response validation schemas
│   │   └── services/
│   │       └── appointment_service.py # Orchestrates ID generation and collision retry
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── orm_models.py       # SQLAlchemy declarative ORM mappings & table constraints
│   │   └── repositories/
│   │       └── postgres_appointment_repo.py # Concrete repository implementation
│   └── api/
│       ├── deps.py                 # Dependency injection providers
│       └── v1/
│           ├── router.py           # V1 endpoint aggregator
│           └── endpoints/
│               ├── health.py       # GET /api/v1/health
│               └── appointments.py # POST /api/v1/appointments
├── alembic/
│   ├── versions/
│   │   └── 0001_initial_appointments.py # Initial migration creating appointments table
│   ├── env.py                      # Async SQLAlchemy Alembic migration runner
│   └── script.py.mako
├── alembic.ini
├── tests/
│   ├── conftest.py                 # Async test client fixture
│   ├── test_health.py              # Health endpoint and DB degradation tests
│   ├── test_domain.py              # Domain entity & status transition tests
│   ├── test_repository.py          # Relational persistence & unique constraint tests
│   ├── test_postgres_integration.py # Real PostgreSQL connection & constraint verification
│   ├── test_service.py             # Service logic & collision retry tests
│   └── test_appointments.py        # API contract, validation, CORS & PHI-logging tests
├── .env.example
├── requirements.txt
└── README.md
```

---

## 3. PostgreSQL Database Requirement & Verification

A running instance of **PostgreSQL 15+ (16 recommended)** is required for local backend development.

### Verifying PostgreSQL Installation
Check whether PostgreSQL tools are available in your path or running service:

```bash
# Check client version
psql --version

# On Windows PowerShell, check running service:
Get-Service *postgres*
```

If using a portable/local PostgreSQL instance (e.g. in `E:\pgsql\bin`):
```powershell
& 'E:\pgsql\bin\psql.exe' --version
```

### Creating the Local Development Database
Connect to PostgreSQL and create the dedicated development database:

```sql
CREATE DATABASE marlow_dental_dev;
```
Or via CLI:
```bash
createdb -U postgres -h localhost marlow_dental_dev
```

*Note: Never connect to or execute destructive statements (`DROP`, `TRUNCATE`, `DELETE`) against production databases. Development and test operations must always target `marlow_dental_dev`.*

---

## 4. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Example Value | Purpose |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Deployment environment name |
| `DEBUG` | `false` | Disables interactive debug docs in production |
| `APP_NAME` | `Marlow Dental API` | Service name |
| `API_V1_PREFIX` | `/api/v1` | URL prefix for V1 endpoints |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Whitelisted CORS origins |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/marlow_dental_dev` | PostgreSQL async connection string |
| `APPOINTMENTS_RATE_LIMIT` | `5/minute` | Rate limit threshold per IP |

---

## 5. Setup & Running Locally

### Virtual Environment & Dependencies

```bash
# Using uv (recommended) or standard venv:
uv venv .venv --python python3.14
uv pip install -r requirements.txt
```

### Schema Migrations (Alembic)
Run migrations to create the `appointments` table and indexes in your local database:

```bash
# Apply pending migrations to reach head:
alembic upgrade head

# Verify current revision:
alembic current

# Verify expected head:
alembic heads
```

### Running the API Server

```bash
# Start development server on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 6. API Endpoints

### 1. Health Status
`GET /api/v1/health`
- **Response (200 OK — Database Connected)**:
  ```json
  {
    "status": "healthy",
    "database": "connected"
  }
  ```
- **Degraded (503 Service Unavailable — Database Disconnected)**:
  ```json
  {
    "status": "degraded",
    "database": "disconnected"
  }
  ```

### 2. Submit Appointment Request
`POST /api/v1/appointments`
- **Request Body**:
  ```json
  {
    "serviceId": "cleanings-exams",
    "preferredDate": "2026-10-15",
    "preferredTime": "10:00 AM",
    "fullName": "Jane Alvarez",
    "phone": "(312) 555-0100",
    "email": "jane@example.com",
    "hasInsurance": true,
    "insuranceProvider": "Delta Dental PPO",
    "notes": "Sensitive lower molar",
    "utmSource": "google",
    "utmCampaign": "lincoln-park"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "confirmationId": "MD-2026-4821",
    "message": "Appointment request received for 2026-10-15 at 10:00 AM.",
    "estimatedCallbackWindow": "Within 1 business hour (Monday to Thursday 8:00 AM to 6:00 PM Central)"
  }
  ```

---

## 7. Running Tests

Run the full pytest suite:

```bash
pytest tests -v
```

All 20 automated tests verify:
- Health status and database degradation handling
- Domain status transitions and entities
- Relational schema persistence and unique constraint enforcement
- Real PostgreSQL async connectivity and integration (`test_postgres_integration.py`)
- Service ID generation and collision retry logic
- CORS headers and rate limiting
- Zero-PHI logging compliance
