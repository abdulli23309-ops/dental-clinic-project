# Marlow Dental — Dental Clinic Project

A modern, production-grade web platform and appointment scheduling service for Marlow Dental, an independent solo dental practice located in Lincoln Park, Chicago.

This repository is organized as a clean monorepo containing both the frontend application and backend service.

---

## Repository Structure

`	ext
dental-clinic-project/
├── frontend/                     # Next.js 16 App Router web application
│   ├── src/                      # TypeScript/React source code & components
│   ├── public/                   # Static branding and web assets
│   ├── docs/                     # Project specifications, PRD & architecture docs
│   ├── package.json              # Frontend scripts and dependencies
│   └── README.md                 # Frontend documentation & local run guide
├── backend/                      # FastAPI Python service & database layer
│   ├── app/                      # Layered domain-driven API architecture
│   ├── tests/                    # Pytest automated test suite
│   ├── alembic/                  # Database migration scripts
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Backend documentation & CLI instructions
├── AGENTS.md                     # Permanent global rules and safety boundaries for AI agents
├── .gitignore                    # Root ignore rules for monorepo
└── README.md                     # This file
`

---

## Applications Overview

The frontend and backend are maintained as independent, decoupled applications inside this repository:

### 1. Frontend (rontend/)
- **Framework**: Next.js 16.3 (App Router, Turbopack, React 19.2)
- **Styling**: Tailwind CSS v4 with custom fluid typography and warm shadow tokens
- **Features**: Patient marketing pages, doctor background & licensure, Chicago office hours status, and interactive multi-step appointment booking wizard with URL synchronization
- **Quickstart**:
  `ash
  cd frontend
  npm install
  npm run dev
  `

### 2. Backend (ackend/)
- **Framework**: FastAPI with Python 3.14+
- **Architecture**: Domain-Driven Design (DDD) with pure domain models, DTO validations, and repository pattern
- **Database**: PostgreSQL (SQLAlchemy 2.0 Async + asyncpg, managed via Alembic migrations)
- **Features**: PHI-safe logging (zero patient data in logs), appointment request ingestion, collision retry, and rate limiting
- **Quickstart**:
  `ash
  cd backend
  uv venv .venv --python python3.14
  uv pip install -r requirements.txt
  pytest tests -v
  uvicorn app.main:app --reload
  `

---

## Global Agent Guidelines

Every AI coding agent operating in this repository must read [AGENTS.md](AGENTS.md) before executing commands or modifying code. It enforces non-negotiable rules on Git safety, database protection boundaries, and engineering principles (KISS, DRY, YAGNI, SOLID, contract-first, docs-as-code).
