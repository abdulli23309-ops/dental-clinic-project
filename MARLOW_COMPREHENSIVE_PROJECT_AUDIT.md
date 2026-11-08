# MARLOW DENTAL — COMPREHENSIVE PROJECT AUDIT & GAP DISCOVERY REPORT
**Date:** 2026-11-04  
**Author:** Principal Software Architect & QA Lead  
**Repository:** https://github.com/abdulli23309-ops/dental-clinic-project  
**Workspace:** `e:\dental clinic project`  
**Current Git Branch:** `feature/hira-clinic-audit-and-seeding`  
**Base Commit:** `279dfff chore: include repo helper methods and update eslint config`  

---

## EXECUTIVE SUMMARY

A rigorous, full-stack, architectural, security, database, and operational audit was executed across the Marlow Dental platform. Every layer of the system—from PostgreSQL relational constraints and forward migrations, through FastAPI backend services and repositories, to Next.js 16 / React 19 frontend pages and API client contracts—was examined against actual execution output, test runs, and compiler verification.

### Key Audit Metrics
- **Backend Test Suite (Pytest):** 534 total tests collected.
  - Baseline execution: 509 passed, 25 failed (due to 2 specific uncommitted repository/service defects), 0 skipped.
- **Frontend Test Suite (Vitest):** 12 test files passed, 63 of 63 unit/component tests passed (100% pass rate).
- **Frontend Type Safety (`tsc --noEmit`):** 0 TypeScript compilation errors.
- **Frontend Production Build (`next build --webpack`):** Exited 0; all 38 routes statically generated or dynamically bundled successfully.
- **Frontend Static Analysis (ESLint):** 9 errors and 430 warnings across the workspace, specifically caused by React 19 Compiler rules (`babel-plugin-react-compiler`) in Next.js 16.
- **Database Migrations:** Current applied head in PostgreSQL is `g1h2i3j4k5l6`. Pending revision `fa5e6d7c8b9a` is valid and required for `FaqItemORM`. Untracked revision `fa6b7c8d9e01` was found to be fundamentally invalid (PostgreSQL syntax error on subqueries in `CHECK` constraints and a destructive unique constraint).

---

## PRIORITY-RANKED FINDINGS MATRIX (P0 to P3)

| Priority | ID | Category | Summary | File & Location Reference |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | SEC-01 | CSRF & Auth | `CSRFProtectionMiddleware` rejects all state-changing requests because path prefix omits `/api/v1` and frontend does not send `X-CSRF-Token`. | [backend/app/main.py](file:///e:/dental%20clinic%20project/backend/app/main.py#L132-L173) |
| **P0** | DB-01 | Database Integrity | Untracked migration `fa6b7c8d9e01` contains invalid PostgreSQL syntax (`CHECK` with subquery) and an erroneous `UNIQUE(clinic_id, service_id)` on `bookings` table. | [backend/alembic/versions/fa6b7c8d9e01_enforce_cross_clinic_write_isolation.py](file:///e:/dental%20clinic%20project/backend/alembic/versions/fa6b7c8d9e01_enforce_cross_clinic_write_isolation.py#L34-L63) |
| **P0** | REPO-01 | Domain & Relational | Uncommitted modification added non-existent `clinic_id` to `ServiceORM`, breaking 19 backend tests with `TypeError` / `AttributeError`. | [backend/app/domain/models/service.py](file:///e:/dental%20clinic%20project/backend/app/domain/models/service.py#L38), [backend/app/infrastructure/repositories/postgres_service_repo.py](file:///e:/dental%20clinic%20project/backend/app/infrastructure/repositories/postgres_service_repo.py#L40-L67) |
| **P0** | BIZ-01 | Business Logic | `reception_service.py` service verification unconditionally fails on service slugs because `svc.clinic_id` is None, blocking valid bookings with HTTP 409. | [backend/app/application/services/reception_service.py](file:///e:/dental%20clinic%20project/backend/app/application/services/reception_service.py#L773-L789) |
| **P1** | UI-01 | Frontend Compilation | 8 ESLint errors caused by Temporal Dead Zone (calling `const` async functions in `useEffect` before their declaration) in Admin Locations & Team pages. | [frontend/src/app/admin/locations/page.tsx](file:///e:/dental%20clinic%20project/frontend/src/app/admin/locations/page.tsx#L216-L225), [frontend/src/app/admin/team/page.tsx](file:///e:/dental%20clinic%20project/frontend/src/app/admin/team/page.tsx#L233-L242) |
| **P1** | UI-02 | Frontend Compilation | 1 ESLint React Compiler error in Admin Services page (`Existing memoization could not be preserved`). | [frontend/src/app/admin/services/page.tsx](file:///e:/dental%20clinic%20project/frontend/src/app/admin/services/page.tsx#L327) |
| **P1** | HTTP-01 | Caching & Headers | `SecurityHeadersMiddleware` unconditionally sets `Cache-Control: no-store, max-age=0`, clobbering public cache headers and ETag validation. | [backend/app/main.py](file:///e:/dental%20clinic%20project/backend/app/main.py#L123-L126) |
| **P2** | DB-02 | Alembic Parity | Database migration `fa5e6d7c8b9a` adds `is_draft`, `breaks_json`, `published_at` to `faq_items` mapped in ORM but unapplied in database. | [backend/alembic/versions/fa5e6d7c8b9a_add_faq_item_draft_publish_columns.py](file:///e:/dental%20clinic%20project/backend/alembic/versions/fa5e6d7c8b9a_add_faq_item_draft_publish_columns.py#L23-L36) |
| **P2** | DB-03 | Alembic Offline Bug | Migration `a5b6c7d8e9f0` invokes `bind.execute().fetchall()` which returns `None` during offline `--sql` generation. | [backend/alembic/versions/a5b6c7d8e9f0_patient_file_number_and_guardian.py](file:///e:/dental%20clinic%20project/backend/alembic/versions/a5b6c7d8e9f0_patient_file_number_and_guardian.py#L65) |
| **P2** | SEC-02 | Media Uploads | `local_storage.py` size validation checks `len(file_bytes)` in memory after reading; streaming request body ceiling should be enforced. | [backend/app/infrastructure/storage/local_storage.py](file:///e:/dental%20clinic%20project/backend/app/infrastructure/storage/local_storage.py#L74) |
| **P3** | SEED-01 | Seed Verification Safety | `verify_seed_reproducibility.py` script contains `DROP DATABASE IF EXISTS`, conflicting with project safety rules unless invoked with isolated test targets. | [backend/scripts/verify_seed_reproducibility.py](file:///e:/dental%20clinic%20project/backend/scripts/verify_seed_reproducibility.py#L34) |
| **P3** | TEST-01 | Pytest Discovery | Untracked scratch files in `_scratch/` top-level directory execute top-level `sys.exit()` if pytest is run without specifying `backend/tests`. | [backend/pytest.ini](file:///e:/dental%20clinic%20project/backend/pytest.ini) |

---

## DETAILED AUDIT FINDINGS BY THE 18 ARCHITECTURAL AREAS

### 1. Workspace Safety & Baseline
- **Git Working Tree:** Clean baseline commit `279dfff`. Nine modified files preserved in unstaged working state. Untracked files identified: `fa6b7c8d9e01_enforce_cross_clinic_write_isolation.py`, `_auth_fix_step1.py`, `_auth_fix_step2.py`, `_fix_auth_csrf.py`.
- **Operating Integrity:** Zero destructive git operations (`reset`, `clean`, `checkout`) or destructive SQL (`DROP`, `DELETE`, `TRUNCATE`) were performed.

### 2. PostgreSQL Schema Parity, Migrations, Constraints & Relational Integrity
- **Database Schema Analysis:**
  - Database `marlow_test` on `localhost:5433` contains 53 core relational tables.
  - Head revision in `alembic_version` is `g1h2i3j4k5l6` (`complete scheduling and booking`).
  - Next sequential migration is `fa5e6d7c8b9a_add_faq_item_draft_publish_columns.py`. This forward migration properly provisions `is_draft`, `breaks_json`, and `published_at` columns required by `FaqItemORM`.
  - Untracked migration `fa6b7c8d9e01_enforce_cross_clinic_write_isolation.py` was evaluated. It attempts to add `CHECK (EXISTS (SELECT 1 FROM services...))` on `bookings`. In PostgreSQL, subqueries in `CHECK` constraints raise `FeatureNotSupportedError: cannot use subquery in check constraint`. Furthermore, line 35 attempted `ADD CONSTRAINT uq_bookings_clinic_service_clinic UNIQUE (clinic_id, service_id)` on `bookings`, which would fatally restrict any clinic to exactly one booking per service in perpetuity.
  - Relational isolation in PostgreSQL is properly modeled via composite unique constraints on referenced tables and composite foreign keys on referencing tables, as already implemented in `clinic_services` (`UNIQUE(clinic_id, service_id)`) and `team_member_clinics` (`UNIQUE(team_member_id, clinic_id)`).

### 3. Seed Scripts, Deterministic Seeding, Data Integrity & Media Assets
- **Seed Implementation:**
  - `backend/scripts/seed_demo_data.py` provides deterministic, idempotent seeding for DHDC (Dr. Hira's Dental Care). It supports `--dry-run` and `--database=NAME`.
  - Populates 18 doctors, 4 branches, 6 core services, working hours (including 24/7 emergency support), provider authorizations, synthetic patients, demo bookings, gallery assets, and reviews.
  - Media asset directory `backend/uploads/` contains 36 verified doctor portraits, clinic branch photographs, gallery assets, and logos.

### 4. Multi-Tenant Cross-Clinic Isolation & Relational Integrity
- **Catalog vs Clinic Offering Architecture:**
  - In Marlow Dental's data architecture, `services` is the practice-wide clinical catalog. Each service has a unique slug and primary key.
  - Clinics offer services dynamically via the junction table `clinic_services (clinic_id, service_id, is_active)`.
  - Doctors are authorized to practice at clinics via `team_member_clinics (team_member_id, clinic_id, is_active, is_primary)`.
  - An earlier uncommitted edit mistakenly added `clinic_id` directly to `ServiceORM` and `Service` domain model, breaking ORM mapping. Correct multi-tenant isolation requires checking `clinic_services` rather than injecting an artificial single `clinic_id` into `services`.

### 5. Authentication, Sessions, JWT, Refresh Tokens & Concurrency
- **Session-Bound JWTs:**
  - Access tokens strictly require a `sid` (session ID) claim.
  - `deps.py` actively validates the session against the `user_sessions` database table, ensuring instant revocation upon logout or administrative session termination.
- **Refresh Token Rotation & Concurrency:**
  - Refresh tokens are hashed using SHA-256 in `refresh_tokens`.
  - A 10-second grace window permits near-simultaneous concurrent refresh calls (common in multi-tab Single Page Applications) without triggering false-positive token family replay revocation.
  - 13/14 tests in `test_auth_security.py` passed cleanly; the sole failing test was due to `ServiceORM` initialization.

### 6. Authorization, RBAC, Role Boundaries & Endpoint Security Matrix
- **Role Enforcement:**
  - Endpoints in `/api/v1/admin/*`, `/api/v1/reception/*`, and `/api/v1/doctor/*` enforce strict role boundaries.
  - Role hierarchy and permissions are dynamically backed by `roles`, `permissions`, and `role_permissions` tables.
  - 211/211 tests in `test_clinical_write_403.py` passed, confirming non-doctor roles cannot forge clinical encounters, notes, or dental charts.

### 7. CSRF Architecture & State-Changing Protections
- **Vulnerability in `CSRFProtectionMiddleware`:**
  - Lines 150–153 check `if path.startswith(("/auth/login", "/auth/refresh", "/auth/register")):`. Because routes are prefixed with `/api/v1`, `path` is `/api/v1/auth/login`, so the exemption is bypassed.
  - Furthermore, `frontend/src/lib/api.ts` does not transmit an `X-CSRF-Token` header.
  - Modern API architecture: API requests authenticated via `Authorization: Bearer <token>` are inherently immune to CSRF because web browsers never automatically attach custom authorization headers. CSRF validation must be applied selectively to cookie-authenticated browser sessions or exempted for Bearer-token and public lead endpoints.

### 8. Secure Cookies, Security Headers & Network Transport Policy
- **Security Headers:**
  - `SecurityHeadersMiddleware` injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
  - **Defect:** Unconditionally overriding `Cache-Control: no-store, max-age=0` prevents public endpoints from returning valid `ETag` and `Cache-Control: public, max-age=3600, must-revalidate` headers.

### 9. Appointment Scheduling, Booking Waterfall, Availability Engine & Concurrency
- **Concurrency & Advisory Locks:**
  - Overlap prevention utilizes PostgreSQL session-level advisory locks on `(team_member_id, preferred_date)`.
  - Booking waterfall strictly verifies: Clinic -> Clinic Services -> Authorized Doctors -> Horizon Slots -> Booking Creation.

### 10. Clinical Workflows, Medical Records & Encounter Depth
- **Depth & Completeness:**
  - Full clinical chart with 32 adult teeth, tooth surfaces (M, O, D, B, L), conditions, treatment plan items, and completed procedures.
  - Database uniqueness constraint guarantees at most one current un-finalized clinical note per patient encounter.

### 11. Reception Desk, Needs-Action Queue & Operating Workflows
- **Workflows:**
  - Reception dashboard manages pending booking requests, call triage, emergency queue, and end-of-day checkout.
  - When `reception_service.py` is corrected, all reception appointment lifecycle tests execute without conflict.

### 12. Patient Management, File Numbers & Medical Alerts
- **Data Model:**
  - Unique sequential file numbers formatted as `MD-XXXX`.
  - Structured medical alerts with emergency contact and minor guardian relationships.

### 13. Financial Workflows, Visit Payments & Voiding
- **Ledger Invariants:**
  - `visit_payments` table enforces non-destructive transaction management. Payments cannot be deleted; voiding records reason, timestamp, and authorizing user ID.

### 14. File Upload Pipeline & MIME Validation
- **Upload Security:**
  - Native Windows binary magic inspection enabled via `python-magic-bin`.
  - Filenames sanitized using UUIDs; path traversal prevented via `Path.resolve().relative_to(upload_dir)`.

### 15. Content Management System (CMS), Public Website & Multi-Location
- **Branding & CMS:**
  - Dynamic organization profile via `/api/v1/public/organization`.
  - Support for 4 clinic locations with branch-specific hours, maps, and staff rosters.

### 16. SQL Query Security & Data Access Layer
- **SQL Injection Defense:**
  - All repository interactions use SQLAlchemy 2.0 type-safe queries.
  - Malicious SQL payloads in login, patient search, and rescheduling were verified rejected.

### 17. Frontend Architecture, Type Safety, State Management & API Contracts
- **Framework & Tooling:**
  - Next.js 16.3.6 (React 19.2.8, TypeScript 5).
  - Production build succeeds without errors.
  - ESLint reports 9 errors strictly related to React 19 Compiler rules in `admin/locations/page.tsx`, `admin/team/page.tsx`, and `admin/services/page.tsx`.

### 18. Production Readiness, Observability & Health Probes
- **Probes:**
  - `/api/v1/health` and `/health` aliases verify database connectivity and system status.
  - Structured logging enabled across all API routers.

---

## STAGE B REMEDIATION PLAN

1. **Remediate Service & Domain Model (P0):**
   - Revert artificial `clinic_id` from `Service` domain model and `PostgresServiceRepository`.
   - Ensure `ServiceORM` maps accurately to `services` table schema.
2. **Remediate Reception Service Clinic Verification (P0):**
   - In `reception_service.py`, look up service by UUID or slug; verify clinic availability by checking `clinic_services` where `(clinic_id, service.id, is_active=True)`.
3. **Remediate CSRF Middleware (P0):**
   - Fix router path prefix `/api/v1` in exempt paths.
   - Exempt Bearer-authenticated endpoints and public submission endpoints from cookie CSRF mismatch.
4. **Remediate Header Caching (P1):**
   - Ensure `SecurityHeadersMiddleware` preserves existing `Cache-Control` headers when already set by downstream endpoints.
5. **Remediate Frontend React Compiler Errors (P1):**
   - Hoist `const` async functions before `useEffect` in `admin/locations/page.tsx` and `admin/team/page.tsx`.
   - Fix memoization in `admin/services/page.tsx`.
6. **Apply Valid Pending Migration (P2):**
   - Execute Alembic migration `fa5e6d7c8b9a` to bring `faq_items` into parity with `FaqItemORM`.
   - Remove/replace the invalid untracked `fa6b7c8d9e01` migration.

---
*End of Stage A Comprehensive Audit Report.*

