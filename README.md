# Marlow Dental — Clinic Web Platform & Appointment API

A production-grade web platform and appointment scheduling service for Marlow Dental, an independent solo dental practice founded by Dr. Sarah Marlow, DDS in Lincoln Park, Chicago.

This repository is maintained as a clean, decoupled monorepo containing both the Next.js frontend application and the FastAPI + PostgreSQL backend service.

---

## 1. Project Status & Roadmap

As documented in `frontend/docs/phases.md` and verified in local runtime testing:

### Verified & Implemented
- **Frontend Core & Motion (Phases 1–7)**: Next.js 16.3 App Router, React 19, Tailwind CSS v4, restrained 2D motion with `motion/react`, full `prefers-reduced-motion` compliance, structured legal and HIPAA pages, dark mode, and zero em-dashes / zero AI clichés.
- **Booking Wizard Rebuild**: 4-step URL-synced appointment request flow (`/book?step=0|1|2|3`), inline validation, and truth-first submission handling.
- **Backend Architecture & Persistence (Phases 8–10)**: FastAPI service following Domain-Driven Design (pure domain entity, repository abstraction, SQLAlchemy 2.0 Async, asyncpg, and Alembic migrations targeting PostgreSQL `dentai_dev`).
- **Zero-PHI Logging**: Strict PHI exclusion from log messages, SQL echoing, and response payloads.
- **Frontend-Backend Integration (Phase 11)**: Booking wizard connected directly to `POST /api/v1/appointments`, validated against real PostgreSQL storage, with 20/20 backend tests passing.

### Explicitly Deferred (Standing Scope Boundary)
- Staff authentication and administrative triage dashboard
- Operatory chair real-time calendar availability engine
- Third-party payment gateways (Stripe / CareCredit)
- Automated transactional SMS (Twilio) and confirmation emails
- Dynamic CMS service catalogue management

---

## 2. Technology Stack

- **Frontend**: Next.js 16.3.6 (Turbopack), React 19.2, TypeScript 5.9, Tailwind CSS v4, Motion 12.
- **Backend**: FastAPI 0.141, Python 3.14+ (managed via `uv`), Pydantic 2.13, Pydantic-Settings 2.15, SlowAPI 0.1.10.
- **Database & Persistence**: PostgreSQL 16+, SQLAlchemy 2.0 Async, `asyncpg` 0.31, Alembic 1.20 migrations.
- **Testing**: Pytest 9.1, Pytest-Asyncio 1.4, HTTPX 0.28, aiosqlite (in-memory test isolation).

---

## 3. Repository Structure

```text
dental-clinic-project/
├── frontend/                     # Next.js 16 App Router web application
│   ├── src/                      # TypeScript/React source code & components
│   │   ├── app/                  # App Router pages (/book, /privacy, /hipaa, etc.)
│   │   ├── components/           # UI primitives, layout shell, and content sections
│   │   └── lib/                  # API client boundary (api.ts) & utilities
│   ├── public/                   # Static branding and web assets
│   ├── docs/                     # Project specifications (prd, architecture, design, rules, phases, memory)
│   ├── .env.example              # Frontend environment template
│   ├── package.json              # Frontend scripts and dependencies
│   └── README.md                 # Frontend documentation
├── backend/                      # FastAPI Python service & database layer
│   ├── app/                      # Layered domain-driven API architecture
│   │   ├── api/v1/               # HTTP endpoints (health, appointments) & deps
│   │   ├── application/          # DTOs and AppointmentService
│   │   ├── core/                 # Config, async database lifecycle, logging
│   │   ├── domain/               # Pure business entities & repository interfaces
│   │   └── infrastructure/       # SQLAlchemy ORM models & PostgreSQL repository
│   ├── tests/                    # 20 automated tests (unit, domain, API, PostgreSQL integration)
│   ├── alembic/                  # Database migration scripts & env.py
│   ├── alembic.ini               # Migration configuration
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Backend environment template
│   └── README.md                 # In-depth backend architecture and CLI guide
├── AGENTS.md                     # Permanent global rules and safety boundaries for AI agents
├── .gitignore                    # Monorepo ignore rules
└── README.md                     # This file
```

---

## 4. Local Quickstart

### Prerequisites
- Node.js 20+ and npm
- Python 3.14+ (or `uv`)
- Running PostgreSQL 16 instance on `localhost:5432` with database `dentai_dev`

### Running the Backend
```bash
cd backend

# Create virtual environment and install dependencies
uv venv .venv --python python3.14
uv pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Run tests (20/20 passing)
pytest tests -v

# Start FastAPI server on http://localhost:8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation will be available at `http://localhost:8000/docs`. See [backend/README.md](backend/README.md) for detailed database setup and CLI examples.

### Running the Frontend
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Run development server on http://localhost:3000
npm run dev
```
Open `http://localhost:3000/book` to submit appointment requests through the booking wizard directly into PostgreSQL `dentai_dev`.

---

## 5. Global Agent Guidelines

Every AI coding agent operating in this repository must read [AGENTS.md](AGENTS.md) before executing commands or modifying code. It enforces non-negotiable rules on Git safety, database protection boundaries, and permanent engineering principles (KISS, DRY, YAGNI, SOLID, contract-first, docs-as-code).

---

## 6. License

Proprietary software. All rights reserved by Marlow Dental. Unauthorized copying or redistribution is strictly prohibited.
