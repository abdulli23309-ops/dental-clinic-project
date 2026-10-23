# DEEP AUDIT: BOOKING WORKFLOW (Marlow Dental)
**Auditor**: Independent Senior Auditor  
**Date**: October 22, 2026  
**Branch**: `feat/booking-flow`  
**Base Branch / Merge-Base**: `feat/clinical-workflows` (`a333ed9e8dd7f470d83c366fca2b00d6954f120f`)  
**Target Test Database**: `marlow_test` (Confirmed; strictly isolated from `dental_dev`)  
**Mode**: READ-ONLY AUDIT  

---

## Executive Summary
- **Audited Branch**: `feat/booking-flow` (Merge-base with `feat/clinical-workflows`: `a333ed9e8dd7f470d83c366fca2b00d6954f120f`).
- **Working Tree State**: Heavily dirty (58 modified tracked files, 26 untracked files).
- **Backend Test Suite (Pytest)**: 488 tests collected — **482 passed, 1 failed, 5 skipped** (98.8% pass rate against `marlow_test`).
- **Frontend Test Suite (Vitest)**: 8 test files — **46/46 passed** (100% pass rate).
- **End-to-End Suite (Playwright)**: 43 tests — **Failing** across test suites due to backend omission in test harness, untracked fixture script, and reception syntax error.
- **Data Model & Migrations**: Single linear Alembic head `e5f6a7b8c9d0`; migration upgrade/downgrade symmetrical; partial unique index on open leads verified.
- **Release Readiness Verdict**: **BLOCKED**
- **Release Blockers**:
  1. A fresh clone or clean checkout fails compilation on `/book` because `frontend/src/app/book/page.tsx` imports untracked `ProgressiveBookingFlow`.
  2. Next.js dev server crashes with a syntax error on `/reception` due to an unclosed `<AnimatedPage>` JSX tag in `src/app/reception/page.tsx:183, 690`.
  3. Literal 64-hex integration key `mk_[0-9a-fA-F]{64}` committed to `backend/.local-credentials.json:20`.
  4. Flaky test failure in `test_booking_marks_lead_converted` (HTTP 409 collision) and 5 skipped database concurrency tests.
  5. Untracked animation library (`motion`) spread across 23 files without operational approval.

---

## Findings Table

| ID | Severity | Area | Finding Summary | Evidence (File:Line / Scratch Log) | Status | Recommended Fix | Effort |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| **F-CRIT-01** | **CRITICAL** | Frontend / Build | `src/app/book/page.tsx` imports untracked component `ProgressiveBookingFlow`; fresh checkout fails compilation. | `frontend/src/app/book/page.tsx:7`<br>`_scratch/A1_git_untracked.txt` | **CONFIRMED** | Commit canonical flow or revert `/book` to tracked `booking-wizard.tsx`. | **S** |
| **F-CRIT-02** | **CRITICAL** | Security / Secrets | Literal 64-hex API key `mk_<64hex>` committed to working tree in local credentials file. | `backend/.local-credentials.json:20`<br>`_scratch/A5_secrets_scan.txt` | **CONFIRMED** | Remove file, add to `.gitignore`, and revoke key in DB. | **S** |
| **F-CRIT-03** | **CRITICAL** | Frontend / Runtime | Syntax error in `reception/page.tsx`: `<AnimatedPage>` opened at L183, closed inside helper at L690; crashes `/reception`. | `frontend/src/app/reception/page.tsx:183, 690`<br>`_scratch/D4_motion_usage.txt` | **CONFIRMED** | Properly close `<AnimatedPage>` before `ReceptionDashboardPage` return. | **S** |
| **F-HIGH-01** | **HIGH** | Governance / Docs | False claims in `docs/BOOKING_FLOW_AUDIT.md`: claims DB CHECK constraint exists (BF8) and E2E passes. | `docs/BOOKING_FLOW_AUDIT.md:28`<br>`_scratch/B1_schema_dump.txt` | **CONFIRMED** | Correct documentation to reflect actual schema and test status. | **S** |
| **F-HIGH-02** | **HIGH** | Backend / Tests | Flaky test failure in `test_booking_marks_lead_converted` (`assert 409 == 201`) due to hardcoded slot collision. | `backend/tests/test_public_booking_flow.py:270`<br>`_scratch/E1_pytest_run_clean.txt` | **CONFIRMED** | Generate unique appointment slot or isolate test fixture doctors. | **S** |
| **F-HIGH-03** | **HIGH** | E2E / Harness | Playwright integration test calls untracked script `ensure_downtown_fixture.py` via system Python. | `frontend/e2e/booking-flow-admin-integration.spec.ts:42` | **CONFIRMED** | Track fixture script or manage test fixtures via backend API/seed. | **M** |
| **F-HIGH-04** | **HIGH** | Backend / Tests | Five critical concurrency and index integration tests skipped in pytest due to hardcoded port 5432 / DB `dentai_dev`. | `backend/tests/test_lead_concurrency.py:16`<br>`backend/tests/test_postgres_integration.py:25` | **CONFIRMED** | Update test connection helper to read port/DB from active environment. | **S** |
| **F-HIGH-05** | **HIGH** | Security / Network | IP allowlist bypass vulnerability in `deps.py`: trusts raw `X-Forwarded-For` without proxy validation. | `backend/app/api/deps.py:622`<br>`_scratch/C1_security_analysis.txt` | **CONFIRMED** | Validate client IP against configured trusted upstream proxy list. | **M** |
| **F-MED-01** | **MEDIUM** | Architecture / UI | Unrequested `motion` animation library spread across 23 files, adding bundle bloat and syntax regressions. | 23 files listed in `_scratch/D4_motion_usage.txt` | **CONFIRMED** | Revert unrequested animation edits or align with owner on scope. | **M** |
| **F-MED-02** | **MEDIUM** | Data Model / Schema | `tasks` table lacks `lead_id` foreign key; lead references are stored only inside text strings (`description`). | `information_schema.columns` (`tasks`)<br>`backend/app/models/task.py` | **CONFIRMED** | Add nullable `lead_id` column with FK to `leads.id` via Alembic migration. | **M** |
| **F-MED-03** | **MEDIUM** | Backend / Logic | Phone normalizer prepends `92` to non-Pakistani numbers >= 7 digits (`+1 555...` -> `921555...`). DRY duplicate code. | `backend/app/domain/models/phone_utils.py:19`<br>`_scratch/B4_phone_normalization.txt` | **CONFIRMED** | Preserve valid international prefixes; deduplicate implementation. | **S** |
| **F-MED-04** | **MEDIUM** | Security / Auth | Default access token lifetime configured to 10,080 minutes (7 days) instead of standard short-lived expiry. | `backend/app/core/config.py:38` | **CONFIRMED** | Lower access token expiry to 15-60 minutes and rely on refresh tokens. | **S** |
| **F-MED-05** | **MEDIUM** | Data Model / DB | Alembic drift: missing indexes `ix_lead_capture_tokens_expires_at` and `ix_visit_payments_voided_by_user_id` in DB. | `_scratch/B2_alembic_check.txt` | **CONFIRMED** | Create Alembic migration to apply missing indexes. | **S** |
| **F-MED-06** | **MEDIUM** | Data Model / Schema | Orphaned dead column `bookings.slot_id`; unused tables `appointments_legacy` and `workflow_runs` in DB. | `_scratch/B5_orphans.txt` | **CONFIRMED** | Remove dead column and clean up unreferenced legacy tables. | **M** |
| **F-MED-07** | **MEDIUM** | Frontend / Tests | Softened test assertion in E2E spec: `clinicCount >= 1` (was `>= 2`), masking multi-clinic dropdown regressions. | `frontend/e2e/booking-flow-admin-integration.spec.ts:133` | **CONFIRMED** | Restore strict multi-clinic assertion `>= 2`. | **S** |
| **F-LOW-01** | **LOW** | Localization / UX | Incomplete Urdu translation in `booking-copy.ts`: `slotTaken` error string remains in plain English. | `frontend/src/content/booking-copy.ts:46`<br>`_scratch/D1_copy_inspection.txt` | **CONFIRMED** | Add Urdu translation for `ur.errors.slotTaken`. | **S** |
| **F-LOW-02** | **LOW** | Accessibility / UX | Missing bidirectional RTL support (`dir="rtl"`) when switching public booking flow to Urdu locale. | `frontend/src/components/booking/booking-wizard.tsx` | **CONFIRMED** | Add dynamic `dir={locale === "ur" ? "rtl" : "ltr"}` to container. | **S** |
| **F-LOW-03** | **LOW** | Developer UX / Docs | Errors in `docs/RUNNING_LOCALLY.md`: database typo (`dentai_dev`), wrong port (5432), invalid Alembic path. | `docs/RUNNING_LOCALLY.md:20, 36` | **CONFIRMED** | Correct database name, port 5433, and path to `..\.venv\Scripts\alembic`. | **S** |
| **F-LOW-04** | **LOW** | Security / Hygiene | Developer name `abdullah` exposed in `backend/.env:6` and in 9 git commits. | `backend/.env:6`<br>`_scratch/A5_secrets_scan.txt` | **CONFIRMED** | Remove personal username identifier from sample configs and scripts. | **S** |

---

## Phase A: Ground Truth Findings

### A1. Git Status and Branch Topology
- **Current Branch**: `feat/booking-flow`
- **Merge-Base with `feat/clinical-workflows`**: `a333ed9e8dd7f470d83c366fca2b00d6954f120f`
- **Diff Stat from Merge Base**: 97 files changed, 9,697 insertions(+), 675 deletions(-)
- **Working Tree Status**: Heavily dirty with 58 modified tracked files and 26 untracked files.
  - **Modified Tracked Files**: Includes `frontend/src/components/booking/booking-wizard.tsx` (+1684/-1361 lines), `frontend/src/content/booking-copy.ts`, `frontend/src/lib/booking-flow-logic.ts`, `frontend/src/lib/api.ts`, E2E test specs, admin and reception pages, global styling, and screenshots.
  - **Untracked Files**: Includes unrequested animation system (`frontend/ANIMATIONS.md`, `frontend/src/animations/variants.ts`, `frontend/src/components/ui/animated-*.tsx`), unrequested progressive booking flow files (`progressive-booking-flow.tsx`, `progressive-booking-copy.ts`), debug error dumps (`frontend/errors*.txt`, `frontend/output.txt`), and temporary scratch files (`frontend/temp.txt`, `frontend/tmp.txt`).
- **Raw Evidence Logs**:
  - `_scratch/A1_git_branch.txt`
  - `_scratch/A1_git_status.txt`
  - `_scratch/A1_git_log.txt`
  - `_scratch/A1_git_diff_stat.txt`
  - `_scratch/A1_git_untracked.txt`

### A2. Runtime and Dependency Environment
- **Node.js**: `v24.13.0`
- **npm**: `11.6.2`
- **Next.js**: `16.3.6` (configured in `frontend/package.json`)
- **Python**: `Python 3.14.8` (Active virtual environment at `.venv/Scripts/python.exe`, Python `3.14.5`)
- **PostgreSQL**: `PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35228, 64-bit`
- **Alembic**: `alembic 1.20.0`
- **Alembic Revisions**:
  - Head revision: `e5f6a7b8c9d0` (single linear head)
  - Total revision migration files: 36 migration scripts in `backend/alembic/versions/`
- **Raw Evidence Logs**:
  - `_scratch/A2_node_version.txt`
  - `_scratch/A2_npm_version.txt`
  - `_scratch/A2_next_version.txt`
  - `_scratch/A2_python_version.txt`
  - `_scratch/A2_package_json.txt`
  - `_scratch/A2_alembic_count.txt`
  - `_scratch/A2_alembic_files.txt`
  - `_scratch/A2_alembic_heads.txt`
  - `_scratch/A2_alembic_history.txt`
  - `_scratch/A2_db_version.txt`

### A3. Database State (`marlow_test` Verification)
- **Database Name Verified**: `marlow_test` (Host: `localhost`, Port: `5433`, User: `postgres`)
- **Current Alembic Version Row**: `['e5f6a7b8c9d0']`
- **Public Tables Count**: 49 tables in `public` schema.
- **Row Counts on Audited Tables**:
  - `leads`: 31
  - `patients`: 23
  - `bookings`: 17
  - `messages`: 1
  - `clinics`: 2
  - `services`: 6
  - `clinic_services`: 7
  - `service_providers`: 9
  - `team_members`: 3
  - `integration_clients`: 3
  - `contact_holds`: 10
  - `call_logs`: 9
  - `lead_events`: 107
- **Raw Evidence Log**: `_scratch/A3_db_inspection.txt`

### A4. Scope of Commits & Working Tree Diff
- **Base Commit**: `a333ed9e8dd7f470d83c366fca2b00d6954f120f` (`feat(clinical-workflows): complete clinical platform, client walkthrough, and cleanup`)
- **Key Modules Introduced/Modified**:
  - Backend models & repos: `booking_flow.py`, `booking_crm.py`, `integration.py`, `phone_utils.py`, `lead_status_service.py`, `booking_eligibility_service.py`, `call_desk_service.py`, `integration_client_service.py`.
  - Frontend: `booking-wizard.tsx`, `booking-copy.ts`, `booking-flow-logic.ts`, `reception/call-desk/page.tsx`, `admin/integrations/page.tsx`.
- **Raw Evidence Logs**:
  - `_scratch/A4_merge_base.txt`
  - `_scratch/A4_diff_stat_from_base.txt`
  - `_scratch/A4_diff_files_from_base.txt`

### A5. Secret and Credential Scanning
- **Methodology**: Automated scanning across working tree, `_scratch/`, docs, scripts, and full git history (all 216 commits) looking for connection string passwords, 64-hex integration keys (`mk_...`), Bearer tokens, `DEMO_` credential references, and the username/author keyword `abdullah`. Secret values were masked and never output.
- **Key Findings**:
  1. **Working Tree Credentials File**: `backend/.local-credentials.json:20` contains a literal 64-hex integration key `mk_[0-9a-fA-F]{64}`. Status: **CONFIRMED**.
  2. **Environment File User / Credentials**: `backend/.env:6` contains the string `abdullah` in connection strings / usernames, and lines 8-11 contain `DEMO_` credential keys. Status: **CONFIRMED**.
  3. **Git History Exposure**: Commits `4c4babfc`, `6646108e`, `ac5afecf`, `bc3a4f46`, and `d0fd78fd` in file `backend/_migcheck.py:25` contain the personal identifier/string `abdullah`. Status: **CONFIRMED**.
  4. **Demo Password Constants**: `backend/app/cli.py` (lines 1073-1084) and docs (`docs/RUNNING_LOCALLY.md:55-57`) contain hardcoded `DEMO_` user credentials. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/A5_secrets_scan.txt`


---

## Phase B: Data Model and Migrations Findings

### B1. Information Schema, Constraints, and Indexes
- **Audited Tables**: Complete schema dump obtained for 17 tables: `leads`, `lead_capture_tokens`, `lead_events`, `lead_sources`, `bookings`, `messages`, `contact_holds`, `call_logs`, `clinic_services`, `service_providers`, `provider_availability`, `booking_flow_settings`, `integration_clients`, `patients`, `team_members`, `clinics`, `services`.
- **Status Checks**:
  - `leads.status`: Verified values in spec: `unconverted`, `converted`, `patient`, `cold`, `failed_conversion`, `archived`. Default is `'unconverted'`.
  - **Absence of Database-Level CHECK Constraints**: While `dental_chart_findings` and `dental_procedures` have SQL `CHECK` constraints on status, NONE of `leads.status`, `bookings.status`, `call_logs.outcome`, or `messages.delivery_status` have SQL CHECK constraints in PostgreSQL. Status integrity is enforced solely in application Python code. Status: **CONFIRMED**.
- **Unique and Partial Indexes**:
  - `uq_leads_open_phone`: `CREATE UNIQUE INDEX uq_leads_open_phone ON public.leads USING btree (phone_normalized) WHERE ((status)::text = 'unconverted'::text)`. Enforces strictly one `unconverted` lead per normalized phone number, matching `docs/BOOKING_FLOW_SPEC.md:17`. Status: **CONFIRMED**.
  - `ix_leads_capture_token`: Unique index on `capture_token`.
  - `ix_lead_capture_tokens_token_hash`: Unique index on `token_hash`.
  - `uq_clinic_services_clinic_service`: Unique index on `(clinic_id, service_id)`.
  - `uq_service_providers_service_team_member`: Unique index on `(service_id, team_member_id)`.
  - `ix_bookings_confirmation_id`: Unique index on `confirmation_id`.
- **Phone Lookup Indexes**:
  - Non-unique B-tree indexes exist on `phone_normalized` across all 6 tables holding normalized phone numbers: `leads` (`ix_leads_phone_normalized`), `patients` (`ix_patients_phone_normalized`), `bookings` (`ix_bookings_phone_normalized`), `messages` (`ix_messages_phone_normalized`), `call_logs` (`ix_call_logs_phone_normalized`), `contact_holds` (`ix_contact_holds_phone_normalized`). Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/B1_schema_dump.txt`

### B2. Spec Comparison and ORM/Migration Drift (`alembic check`)
- **Alembic Drift Detected**: Running `alembic check` failed with multiple detected drift operations between SQLAlchemy ORM (`orm_models.py`) and PostgreSQL schema:
  1. `lead_capture_tokens`: ORM declares `ix_lead_capture_tokens_expires_at` on `expires_at`, but migration `d4e5f6a7b8c9` did not create this index. Status: **CONFIRMED**.
  2. `booking_flow_settings`: ORM names unique index `ix_booking_flow_settings_organization_id`, but migration `a6b7c8d9e0f2` created `uq_booking_flow_settings_org_id` and index `ix_booking_flow_settings_org_id`. Status: **CONFIRMED**.
  3. `appointments_legacy`: ORM specifies index name `ix_appointments_legacy_confirmation_id`, but DB retains old name `ix_appointments_confirmation_id`. Status: **CONFIRMED**.
  4. `visit_payments`: ORM declares `ix_visit_payments_voided_by_user_id`, which was never created in any migration. Status: **CONFIRMED**.
- **Raw Evidence Logs**:
  - `_scratch/B2_alembic_check.txt`
  - `_scratch/B2_spec_comparison.txt`

### B3. Migration Reversibility and Data Safety
- **Booking Flow Migrations**:
  - `d3e4f5a6b7c8`: Adds `phone_normalized`, `clinic_services`, modifies `bookings.patient_email` to nullable. On downgrade, injects synthetic string `'placeholder@marlowdental.local'` into `bookings.patient_email` before re-applying `NOT NULL`. Status: **CONFIRMED**.
  - `e4f5a6b7c8d9`: Migrates legacy statuses (`new`, `contacted`, `qualified` -> `unconverted`). On downgrade, information about original pre-migration statuses is permanently lost. Status: **CONFIRMED**.
  - `f5a6b7c8d9e0`: Adds communication fields and tables (`contact_holds`, `call_logs`, `lead_events`). Symmetrical drop on downgrade. Status: **CONFIRMED**.
  - `a6b7c8d9e0f2`: Adds `booking_flow_settings`. Symmetrical. Status: **CONFIRMED**.
  - `b7c8d9e0f1a2`: Adds `ix_bookings_team_member_status` composite index for `patientsTreated`. Symmetrical. Status: **CONFIRMED**.
  - `c8d9e0f1a2b3`: Adds `clinic_id` to `provider_availability` with doctor fallback backfill. Symmetrical. Status: **CONFIRMED**.
  - `d4e5f6a7b8c9`: Creates `lead_capture_tokens` table and partial index `uq_leads_open_phone`. Symmetrical. Status: **CONFIRMED**.
  - `e5f6a7b8c9d0`: Creates `integration_clients` table and indexes. Symmetrical. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/B3_migration_analysis.txt`

### B4. Phone Normalization Implementation and Edge Cases
- **Shared Normalizer**: `app.domain.models.phone_utils.normalize_pakistan_phone`.
- **DRY Violation**: A verbatim duplicate copy of `normalize_pakistan_phone` is defined in `backend/app/application/services/reception_service.py:72-85` rather than imported from `phone_utils.py`. The frontend also re-implements it in `frontend/src/lib/api.ts:2769-2782`. Status: **CONFIRMED**.
- **Edge Case Analysis**:
  - Standard Pakistani formats (`+92 300 1234567`, `0300-1234567`, `00923001234567`, `3001234567`) correctly normalize to `923001234567`.
  - Landlines (`04235871234`, `4235871234`) correctly normalize to `924235871234`.
  - **Foreign / International Numbers**: Any number >= 7 digits not starting with `92` (such as `+1 555 123 4567`) gets prefixed with `92` (`9215551234567`), corrupting foreign phone numbers. Status: **CONFIRMED**.
  - **Double-Prefix with Zero**: `9203001234567` (user typing +92 followed by 0300) is NOT stripped of the 0; returns `9203001234567` (13 digits). Status: **CONFIRMED**.
  - **Short codes / letters**: `1234` returns `1234` (< 7 digits). Non-digits (`abc`) correctly return `""`.
- **Write Path Coverage**:
  - `leads`: Normalized on write via `public_content.py:339`, `public_content.py:492`, `integration.py:93,133`, `call_desk_service.py:574`.
  - `patients`: Normalized on write via `integration.py:1018` and `postgres_booking_repo.py:20`.
  - `bookings`: Normalized on write via `postgres_booking_repo.py:20,36,90` and `integration.py:1037`.
  - `messages`: Normalized on write via `integration.py:378` and `postgres_message_repo.py`.
  - `call_logs`: Normalized on write via `call_desk_service.py:514` and `cli.py:1430`.
  - `contact_holds`: Normalized on write via `call_desk_service.py:426` and `cli.py:1454`.
- **Raw Evidence Log**: `_scratch/B4_phone_normalization.txt`

### B5. Database and Code Orphans
- **`appointments_legacy`**: Table exists in PostgreSQL (`marlow_test`) and `orm_models.py:1693`, but NO application code or active endpoint writes to it. Confirmed by `backend/tests/test_messaging_and_reminders_upgrade.py:816` ("Writing to appointments_legacy is strictly forbidden"). Status: **CONFIRMED**.
- **`workflow_runs`**: Table exists in PostgreSQL (`marlow_test`) and `orm_models.py:1537`, but is completely unused by any service, router, or repository. Status: **CONFIRMED**.
- **`bookings.slot_id`**: The `slots` table was removed in migration `f9a0b1c2d3e4`, but column `bookings.slot_id` remains in `orm_models.py:1167` and DB, passed as dead `null` values throughout doctor and reception endpoints. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/B5_orphans.txt`


---

## Phase C: Backend Behaviour and Security Findings

### C1. Route Inventory, Role RBAC, and Integration Scopes
- **API Surface**: 196 registered OpenAPI endpoints, including 124 write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Doctor-Only Clinical Writes**: Strictly enforced via `Depends(require_doctor_strictly)`. Clinicians only can record/confirm clinical medical alerts, encounters, notes, and treatment plans. Administrators cannot write clinical records. Status: **CONFIRMED**.
- **Admin Clinical Read Auditing**: Admins accessing patient medical alerts or encounters go through audited methods in `MedicalAlertService` logging to `activity_logs`. Status: **CONFIRMED**.
- **Receptionist Medical Alert Detail Shielding**: Receptionists are barred by role dependency from accessing `GET /api/v1/clinical/patients/{id}/alerts`. Status: **CONFIRMED**.
- **Integration API Scopes**: Scopes (`leads:read`, `leads:write`, `messages:read`, `messages:write`, `bookings:read`, `bookings:write`, `lookup:read`) are strictly enforced per endpoint using `require_integration_scope(...)`. Status: **CONFIRMED**.
- **Public Endpoint Rate Limiting**: All public endpoints (`/api/v1/public/leads`, `/api/v1/public/availability`, `/api/v1/public/booking/*`, `/api/v1/appointments`) are rate-limited via SlowAPI limiter decorators. Status: **CONFIRMED**.
- **Raw Evidence Logs**:
  - `_scratch/C1_routes_audit.txt`
  - `_scratch/C1_security_analysis.txt`

### C2. Public Lead Capture Engine (`POST /api/v1/public/leads`)
- **Open Lead Guarantee & Concurrent Requests**: Concurrent submission test (`C2.3`) of identical phone numbers resulted in exactly 1 open (`unconverted`) lead created in PostgreSQL (`marlow_test`), backed by `pg_advisory_xact_lock(hashtext('lead_open_<phone>'))` and `uq_leads_open_phone` partial index. Status: **CONFIRMED**.
- **Phone Format Resumption**: Submitting different formats (`0300 123 4567` vs `00923001234567`) resumes and updates the existing open lead without duplicating. Status: **CONFIRMED**.
- **Honeypot Trap**: Honeypot field name is `hp` (`PublicLeadCaptureRequest.hp`). When populated by a spam bot, the API returns a synthetic `PublicLeadCaptureResponse(captureToken=...)` with HTTP 201 without writing any row to `leads` table. Status: **CONFIRMED**.
- **Patient Privacy & Response Indistinguishability**: Submitting an existing registered patient's phone number vs an unknown phone number returns identical HTTP 201 status and JSON shape (`{"captureToken": "..."}`). Internal lead IDs, patient IDs, and patient registration status are never revealed. Status: **CONFIRMED**.
- **Token Security**: Tokens are generated using `secrets.token_urlsafe(32)` and hashed at rest in `lead_capture_tokens.token_hash` via SHA-256. Tampered or invalid tokens on `PATCH /api/v1/public/leads/{token}` return HTTP 404. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/C_backend_test_results.txt`

### C3. Public Booking Submission (`POST /api/v1/appointments`)
- **Endpoint Ground Truth**: The public appointment submission endpoint is `POST /api/v1/appointments` (prior reports referencing `/public/booking/leads` or `/appointments/requests` were incorrect/aborted).
- **Concurrency & Double-Booking Lock (HTTP 409)**: Booking submissions execute inside `async with _acquire_schedule_lock(...)` which acquires PostgreSQL advisory locks on the schedule date. Immediate conflicting submissions for the same doctor, date, and slot return `HTTP 409 Conflict` with `detail: "Double-booking conflict: The selected time slot is no longer available. Please select another slot."`. Status: **CONFIRMED**.
- **Lead Token Conversion**: Supplying `leadToken` from step 1 updates the lead status from `unconverted` to `converted` and records a `lead_events` audit row. Status: **CONFIRMED**.
- **Past Date Validation**: Submitting a past appointment date fails Pydantic validator `validate_preferred_date` with `HTTP 422 Unprocessable Entity` ("preferredDate cannot be in the past."). Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/C_backend_test_results.txt`

### C4. Eligibility and Doctor Card Availability
- **Public Booking Discovery Flow**:
  1. `GET /api/v1/public/booking/services`: Lists bookable services.
  2. `GET /api/v1/public/booking/clinics?serviceId={id}`: Enforces `serviceId` query param; returns only clinics offering that service.
  3. `GET /api/v1/public/booking/doctors?serviceId={id}&clinicId={id}`: Enforces both `serviceId` and `clinicId`; returns eligible doctor cards.
- **Doctor Card Attributes & Privacy**:
  - Doctor cards return `displayName`, `professionalTitle`, `patientsTreated`, `weeklyScheduleSummary`, and embedded `slotsByDate`.
  - Privacy verified: No private clinician data (`email`, `phone`, `license`, `nationalId`, `salary`) is exposed in public responses. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/C_backend_test_results.txt`

### C5. Lead Status Engine and Automated Cold Rules
- **Cold Rule Verification**: `LeadStatusService.mark_cold_leads()` marks leads cold when `attempts >= max_attempts` (3) and `cold_wait_hours` (24) have elapsed without inbound reply or booking.
- **Idempotent Task Creation**: Exactly one task is created for cold leads; running `mark_cold_leads()` repeatedly does not produce duplicate tasks. Status: **CONFIRMED**.
- **Data Model Limitation**: The `tasks` table lacks a foreign key `lead_id` column. Tasks created for cold leads store the lead's identity only in the text string `description`. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/C_backend_test_results.txt`

### C6. Reception Call Desk & Contact Hold Lifecycle
- **Call Desk Endpoints**:
  - `GET /api/v1/reception/call-desk/lookup?phone=...`: Aggregates patients, leads, bookings, and messages for a caller phone.
  - `POST /api/v1/reception/call-desk/holds`: Places or extends a hold on `phone_normalized` in `contact_holds` (`held_until`).
  - `DELETE /api/v1/reception/call-desk/holds?phone=...`: Releases the hold immediately.
  - `POST /api/v1/reception/call-desk/outcomes`: Records call outcome (`info_only`, `booked`, `dropped`, etc.), releases hold, and logs to `call_logs`.
- **Hold Selective Suppression**: In `reception_service.py:2140-2144`, `is_held()` suppresses automated messages ONLY if `msg.purpose == "lead_recovery"`. Appointment confirmations and reminder messages are NEVER suppressed by a contact hold. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/C_backend_test_results.txt`

### C7. Integration API & Security Architecture
- **Key Authentication**: Integration keys are formatted `mk_<64 hex chars>`. Key lookup indexes the first 11 characters (`key_prefix = 'mk_' + 8 hex`). Keys are verified against SHA-256 hashes using `hmac.compare_digest` (constant-time). Unauthenticated requests return `HTTP 401`. Status: **CONFIRMED**.
- **IP Allowlist & Spoofing Risk**: `IntegrationClientService` supports optional IP allowlists, but `deps.py:622` reads client IP from `request.headers.get("X-Forwarded-For")` without proxy trust verification, making it susceptible to IP header spoofing in deployments lacking an upstream gateway that sanitizes `X-Forwarded-For`. Status: **CONFIRMED**.
- **Production Safety Controls**: `Settings.verify_production_safety` refuses startup in `production` mode if `JWT_SECRET_KEY` is under 32 characters or contains default insecure development markers. Status: **CONFIRMED**.
- **Excessive Token Lifetime**: Default `ACCESS_TOKEN_EXPIRE_MINUTES` is configured to 10,080 minutes (7 days), which is unusually long for access tokens. Status: **CONFIRMED**.



## Phase D: Frontend and UX Findings

### D1. Public Booking Flow at `/book`
- **Architectural Divergence & Untracked Files**:
  - The repository contains two competing implementations of the booking wizard:
    1. `frontend/src/components/booking/booking-wizard.tsx` (Tracked in Git, 1,732 lines): Implements the full 6-step flow (`DETAILS`, `SERVICE`, `LOCATION`, `DOCTOR`, `DATETIME`, `REVIEW`) specified in Section 1 of `BOOKING_FLOW_SPEC.md`.
    2. `frontend/src/components/booking/progressive-booking-flow.tsx` (Untracked in Git, 1,416 lines): Implements an alternative 3-step waterfall layout (`Contact & Notes` -> `Waterfall: Service -> City -> Branch -> Doctor -> Date & Time` -> `Review`).
  - **Critical Build Failure Risk**: `frontend/src/app/book/page.tsx:7` was modified in the working tree to import `ProgressiveBookingFlow` from the untracked file `@/components/booking/progressive-booking-flow`. On a clean checkout or CI build, `/book` crashes immediately with `Module not found`. Status: **CONFIRMED**.
- **Step Auto-Skip Rule**:
  - Both components implement single-option auto-skipping: when only one service, one clinic, or one doctor is available, the option is automatically preselected.
  - Doctor introduction card: When a doctor is auto-selected, an introduction card displaying their photo, title, and bio is rendered above the time slots. Status: **CONFIRMED**.
- **Doctor Card Attributes & Privacy Switches**:
  - Doctor cards render display name, title, bio, working days, and free slots.
  - The `patients_treated` count is dynamically retrieved and rendered only when `show_patients_treated = True`. When toggled off in Admin settings, the badge is suppressed. Status: **CONFIRMED**.
- **Conversational Copy & Localization**:
  - `frontend/src/content/booking-copy.ts` provides bilingual dictionaries (`en` and `ur`).
  - **Incomplete Urdu Translation**: In `booking-copy.ts:46`, `ur.errors.slotTaken` contains the English fallback string: `"That time was just taken. Here are the nearest free times."` instead of an Urdu translation.
  - **Missing RTL Layout**: The application contains no `dir="rtl"` attribute or bidirectional styling logic when Urdu copy is rendered. Status: **CONFIRMED**.
- **Raw Evidence Logs**:
  - `_scratch/D1_copy_inspection.txt`
  - `_scratch/A1_git_untracked.txt`

### D2. Reception & Admin Workflows
- **Reception Call Desk (`/reception/call-desk`)**:
  - Implements caller phone lookup, real-time hold acquisition (`POST /call-desk/holds`), locked wizard booking (phone number prefilled and locked to prevent accidental lead divergence), and outcome recording (`POST /call-desk/outcomes`).
  - Ending a call immediately invokes `DELETE /call-desk/holds` to release contact suppression. Status: **CONFIRMED**.
- **Reception Leads Management (`/reception/leads`)**:
  - Implements status tabs (`unconverted`, `converted`, `patient`, `cold`, `failed_conversion`, `archived`), attempt count indicators, timeline drawer, and manual status modal. Status: **CONFIRMED**.
- **Reception Messages View (`/reception/messages`)**:
  - Renders unified conversation thread per normalized phone, combining inbound, outbound, and simulated messages.
  - Honest simulation disclosure: Simulated automation messages are clearly tagged with an explicit visual disclaimer (`SIMULATED AUTOMATION`). Status: **CONFIRMED**.
- **Admin Integrations (`/admin/integrations`)**:
  - Implements service-account key management: key creation with single plaintext reveal (`mk_<64hex>`), granular scope selection, active status toggle, and key revocation. Status: **CONFIRMED**.
- **Admin Bookability Diagnostic Matrix (`/admin/bookability` & `/admin/services`)**:
  - Displays clinic-service linkage and doctor-service provider mapping with clear indicators of why a service or clinic may not be bookable online. Status: **CONFIRMED**.

### D3. Accessibility and Responsive Design
- **Keyboard Navigation**: Wizard form inputs, buttons, and calendar slots support standard focus management and tab ordering.
- **ARIA Implementation**:
  - Wizard steps define `aria-current="step"` and descriptive labels.
  - Calendar slot buttons define `aria-label` specifying doctor, date, and time.
- **Mobile Responsiveness**:
  - Grid layouts collapse to single-column on mobile viewports (`sm:grid-cols-2`, `xl:grid-cols-6`).
  - Modal dialogues and drawers render full-width on mobile. Status: **CONFIRMED**.

### D4. Motion Animation System Audit
- **Unrequested Modification**: The working tree introduces `motion` (Framer Motion / Motion 13.4.4) across 23 files, including shared components:
  - `frontend/src/app/layout.tsx`
  - `frontend/src/components/dashboard/shared-dashboard-layout.tsx`
  - `frontend/src/components/ui/card.tsx`
  - `frontend/src/components/ui/theme-toggle.tsx`
  - `frontend/src/app/reception/page.tsx`
  - `frontend/src/app/doctor/page.tsx`
  - `frontend/src/app/admin/booking/page.tsx`
- **Critical Syntax Regression in `frontend/src/app/reception/page.tsx`**:
  - In `frontend/src/app/reception/page.tsx:183`, `<AnimatedPage>` is opened inside `ReceptionDashboardPage()`.
  - The closing tag `</AnimatedPage>` was erroneously placed inside a completely separate helper component `QuickLink()` at line 690.
  - Consequence: When Next.js dev server compiles `/reception`, SWC / Turbopack fails with `Error: Unexpected token. Did you mean {'}'} or &rbrace;? Parsing ecmascript source code failed`. The entire receptionist dashboard is broken at runtime. Status: **CONFIRMED**.
- **Reduced Motion Support**:
  - `frontend/src/animations/variants.ts` and `motion-reduced.ts` provide reduced-motion fallbacks, but emulated reduced-motion checks in Playwright failed during test runs. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/D4_motion_usage.txt`

---

## Phase E: Test Suite Quality and Execution Results

### E1. Pytest Suite Execution (Backend)
- **Target Database**: `marlow_test` on `localhost:5433` (isolated from `dental_dev`).
- **Execution Command**: `.venv\Scripts\pytest backend/tests -v`
- **Results**: **488 collected; 482 passed, 1 failed, 5 skipped** in 83.33 seconds.
- **Detailed Failure Analysis**:
  - **Failing Test**: `backend/tests/test_public_booking_flow.py::test_booking_marks_lead_converted`
  - **Error**: `assert 409 == 201`
  - **Root Cause**: The test hardcodes an appointment submission for slot `"02:00 PM"` on a fixed relative date (`tomorrow`). Because database fixtures or previous test runs already reserved that doctor/slot combination, `_acquire_schedule_lock` correctly enforced the double-booking check and returned `HTTP 409 Conflict`, causing the test assertion `response.status_code == 201` to fail. This is a flaky test relying on hardcoded slot availability without dynamic slot selection. Status: **CONFIRMED**.
- **Detailed Skip Analysis**:
  - **Skipped Tests (5 total)**:
    1. `backend/tests/test_lead_concurrency.py::test_concurrent_lead_creation_stress`
    2. `backend/tests/test_lead_concurrency.py::test_concurrent_hold_and_lead_resumption_stress`
    3. `backend/tests/test_postgres_integration.py::test_postgres_connection_and_version`
    4. `backend/tests/test_postgres_integration.py::test_lead_partial_unique_index_enforcement`
    5. `backend/tests/test_postgres_integration.py::test_contact_holds_advisory_locking`
  - **Reason for Skips**: These tests contain hardcoded fallback connection strings pointing to port `5432` and database name `dentai_dev` / `postgres`. Because the local test runner operates on port `5433` with database `marlow_test`, the helper function `@pytest.mark.skipif(not is_postgres_available())` evaluated to `False` and skipped these critical concurrency and index enforcement tests. Status: **CONFIRMED**.
- **Raw Evidence Log**: `_scratch/E1_pytest_run_clean.txt`

### E2. Vitest Suite Execution (Frontend)
- **Execution Command**: `npm test` (`vitest run`) in `frontend/`
- **Results**: **8 test files passed (8/8), 46 tests passed (46/46)** in 55.01 seconds.
- **Audited Specs**:
  - `booking-banner.test.tsx` (5 passed)
  - `booking-flow-logic.test.ts` (14 passed)
  - `booking-slots.test.tsx` (5 passed)
  - `reception-desk-logic.test.ts` (6 passed)
  - `role-navigation.test.ts` (3 passed)
  - `schedule-chips.test.tsx` (5 passed)
  - `progressive-booking-copy.test.ts` (5 passed)
  - `progressive-flow-state.test.ts` (3 passed)
- **Raw Evidence Log**: `_scratch/E1_vitest_run.txt`

### E3. ESLint and Next.js Build
- **ESLint**: Clean pass (0 errors, 0 warnings).
- **Next.js Build**: `npm run build` (`next build --webpack`) succeeded, compiling 50 static/dynamic routes.
- **Build Discrepancy**: While webpack build succeeds, Turbopack (`next dev`) fails on `/reception` due to the syntax error in `frontend/src/app/reception/page.tsx:671`. Status: **CONFIRMED**.
- **Raw Evidence Logs**:
  - `_scratch/E1_lint_run.txt`
  - `_scratch/E1_build_run.txt`

### E4. Playwright End-to-End Suite
- **Inventory**: 43 tests across 9 spec files (`_scratch/E1_playwright_list.txt`).
- **Execution Run**: Run produced multiple failures across test suites (`_scratch/E1_playwright_run.txt`).
- **Root Causes of E2E Failures**:
  1. **Backend Server Omission in `playwright.config.ts`**: The configuration only spins up `npm run dev` on port 3000. It does not launch the FastAPI backend on port 8000. Tests attempting live backend integration immediately hit `net::ERR_CONNECTION_REFUSED`.
  2. **Untracked Database Script Dependency**: `frontend/e2e/booking-flow-admin-integration.spec.ts:42` executes `execSync("python ensure_downtown_fixture.py", { cwd: "../../backend/scripts" })`. The script `ensure_downtown_fixture.py` is untracked and relies on system Python instead of the virtual environment.
  3. **Dev Server Crash on Reception Pages**: Tests visiting `/reception` crash because of the unclosed `<AnimatedPage>` JSX error in `reception/page.tsx`. Status: **CONFIRMED**.

### E5. Weak and Loosened Assertions
- **Clinic Count Assertion**: In `frontend/e2e/booking-flow-admin-integration.spec.ts`, assertion was softened from `expect(count).toBeGreaterThanOrEqual(2)` to `expect(count).toBeGreaterThanOrEqual(1)`, hiding multi-clinic dropdown regressions.
- **Absence of Database CHECK Constraints**: Tests assert that invalid statuses return HTTP 422 at the Pydantic API boundary, but no tests assert database-level rejection because no database CHECK constraints exist. Status: **CONFIRMED**.

---

## Phase F: Documentation Claims vs Reality

### F1. `docs/BOOKING_FLOW_SPEC.md`
- **Claims vs Reality**:
  - **Spec Order**: Step 1 contact, Step 2 service, Step 3 clinic, Step 4 doctor, Step 5 notes, Step 6 review. **Reality**: Tracked `booking-wizard.tsx` matches this order. Untracked `progressive-booking-flow.tsx` switches to a 3-page progressive waterfall.
  - **Task Linkage**: Spec Section 2 states cold leads and failed conversions create exactly one reception task. **Reality**: Verified, but `tasks` table stores the lead identity in text description only; no `lead_id` foreign key exists.
  - **Copy Module**: Spec Section 1 mandates conversational copy in `frontend/src/content/booking-copy.ts`. **Reality**: Followed for `booking-wizard.tsx`, but `progressive-booking-flow.tsx` created a separate untracked file `progressive-booking-copy.ts`.

### F2. `docs/BOOKING_FLOW_AUDIT.md` (Prior Audit Report)
- **Claim**: BF8 status states: *"Database CHECK constraint enforces exact 6 allowed statuses."*
  - **Reality**: **FALSE**. Direct `information_schema` inspection of `marlow_test` confirms ZERO check constraints exist on `leads.status`.
- **Claim**: BF1, BF2, BF10, BF11, BF13 verified and passing via Playwright E2E suite (`booking-flow-roles-and-states.spec.ts`).
  - **Reality**: **FALSE**. Playwright tests fail due to offline backend, fixture script dependencies, and syntax errors.
- **Claim**: `ProgressiveBookingFlow` is complete and verified as the public `/book` route.
  - **Reality**: **UNCOMMITTED / UNTRACKED**. The component files and its test files are untracked in git.

### F3. `docs/INTEGRATION_API.md`
- **Claim**: Documents 14 integration endpoints for automation clients authenticated via `X-Marlow-Key`.
- **Reality**: **VERIFIED**. All 14 endpoints (`/leads`, `/attempt`, `/due`, `/messages`, `/status`, `/failed-conversion`, `/lookup`, `/booking-options`, `/bookings`, `/reschedule`, `/cancel`, `/confirmation-data`, `/unconfirmed-messages`) match `integration.py` and `app.openapi()`.

### F4. `docs/REQUIREMENTS_STATUS.md` and `docs/REACHABILITY_AUDIT.md`
- **Claim**: 54/54 requirements built with 0 missing and 0 partial.
- **Reality**: **MISLEADING**. While code files exist, the public booking route depends on untracked files, the reception page has runtime syntax crashes, and E2E suites fail.
- **Claim**: 226 backend routes reported in `REACHABILITY_AUDIT.md`.
  - **Reality**: `app.openapi()` exposes 196 distinct paths in the current application configuration.

### F5. `docs/RUNNING_LOCALLY.md`
- **Claim**: Local quickstart specifies `DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dentai_dev`.
  - **Reality**: Typo in database name (`dentai_dev` instead of `dental_dev`), and wrong port (`5432` instead of active PostgreSQL `5433`).
- **Claim**: Alembic sync runs via `cd backend && .\.venv\Scripts\alembic upgrade head`.
  - **Reality**: Invalid path. The `.venv` folder resides in repository root, not inside `backend/`.

---

## Phase G: Release Readiness Checklist

| Readiness Check | Status | Evidence & Risk |
| :--- | :---: | :--- |
| **G1. Clean Working Tree** | **FAILED** | 58 modified tracked files and 26 untracked files in working tree (`_scratch/A1_git_status.txt`). |
| **G2. Clean Clone Buildability** | **FAILED** | `src/app/book/page.tsx` imports untracked component `ProgressiveBookingFlow`. Clean checkout will fail compilation. |
| **G3. Runtime Syntax Integrity** | **FAILED** | Syntax error in `frontend/src/app/reception/page.tsx:183, 690` (`<AnimatedPage>` unclosed) crashes `/reception`. |
| **G4. Backend Test Suite** | **PARTIAL** | 482/488 pytest passed. 1 test failed (flaky slot collision), 5 skipped due to hardcoded DB connection strings. |
| **G5. Frontend Unit Test Suite** | **PASSED** | 46/46 vitest passed across 8 test suites. |
| **G6. E2E Test Suite** | **FAILED** | Playwright fails due to backend server omission, untracked fixture script, and reception syntax error. |
| **G7. Migration Linearity & Safety** | **PASSED** | Single linear Alembic head `e5f6a7b8c9d0`. Migrations upgrade and downgrade cleanly. |
| **G8. Secret & Credential Hygiene** | **FAILED** | Plaintext `mk_` integration key found in `backend/.local-credentials.json:20`; developer name `abdullah` in `.env` and git history. |
| **G9. Security Controls & Rate Limits** | **PARTIAL** | Key hashing and lock serialization verified; IP allowlist spoofing risk in `deps.py:622` (`X-Forwarded-For`). |
| **G10. Spec & Feature Completeness** | **PARTIAL** | Core booking and call desk flows implemented, but task FK missing, Urdu translation incomplete, and architecture split. |

---

## Phase H: Spec Coverage Gap Matrix

### H1. Requirements Verification Matrix (`docs/BOOKING_FLOW_SPEC.md`)

| Spec Requirement | Status | Evidence (Route / Component / DB) | Audit Finding & Assessment |
| :--- | :---: | :--- | :--- |
| **1. Website Flow: Step Order** | **PARTIAL** | `booking-wizard.tsx` vs `progressive-booking-flow.tsx` | Tracked wizard implements 6 steps. Untracked progressive flow implements 3 pages. `/book` imports untracked flow. |
| **1. Lead Save on Step 1** | **BUILT** | `POST /api/v1/public/leads`, `leads` table | Lead saved on Continue, not on keystrokes. Deduplicated by phone; returns capture token. |
| **1. Bookability Filtering** | **BUILT** | `GET /api/v1/public/booking/clinics`, `services` | Clinics filtered by `clinic_services.is_active`; doctors filtered by `service_providers`. |
| **1. Doctor Card & Free Slots** | **BUILT** | `GET /api/v1/public/booking/doctors` | Returns title, bio, working hours, and real `slotsByDate`. Privacy toggle hides `patientsTreated`. |
| **1. Single-Option Auto-Skip** | **BUILT** | `booking-flow-logic.ts:autoSelectSingleOptions` | Automatically selects single service/clinic/doctor; displays intro card when doctor is auto-selected. |
| **1. Slot Re-validation Lock** | **BUILT** | `POST /api/v1/appointments`, advisory locks | Re-checks slot under lock; returns `HTTP 409 Conflict` on race collision. |
| **1. Booking for Someone Else** | **BUILT** | `bookings.patient_id`, `patients.is_primary` | Contact number identifies primary booker; separate patient profile created for appointment beneficiary. |
| **1. Conversational Copy Module** | **PARTIAL** | `frontend/src/content/booking-copy.ts` | Centralized copy exists, but Urdu dictionary has English string for `slotTaken` and lacks RTL styling. |
| **2. Lead Statuses (6 allowed)** | **PARTIAL** | `leads.status`, `LeadStatusService` | Allowed statuses handled in Python ORM, but database lacks CHECK constraint. |
| **2. Lead Status Migration** | **BUILT** | Alembic migration `e5f6a7b8c9d0` | Migrates legacy statuses (`new`, `contacted`, `qualified` -> `unconverted`). |
| **2. Lead Re-contact Rule** | **BUILT** | `uq_leads_open_phone` partial index | Exactly one `unconverted` lead allowed per normalized phone. Subsequent contacts update existing open lead. |
| **2. Cold Lead Rule (3 attempts + 24h)** | **BUILT** | `LeadStatusService.mark_cold_leads()` | Marks cold after 3 attempts + 24h; creates exactly one task. However, task lacks `lead_id` FK. |
| **2. Failed Conversion Rule** | **BUILT** | `POST /integration/leads/{id}/failed-conversion` | Marks failed conversion and generates exactly one high-priority reception task. |
| **3. Booking Flow Settings** | **BUILT** | `booking_flow_settings` table | Configurable `max_attempts`, `cold_wait_hours`, `hold_minutes`, `days_shown`, `show_patients_treated`. |
| **4. Call Desk Lookup & History** | **BUILT** | `GET /api/v1/reception/call-desk/lookup` | Aggregates patients, leads, bookings, and messages for caller phone number. |
| **4. Contact Hold Lifecycle** | **BUILT** | `POST/DELETE /api/v1/reception/call-desk/holds` | Hold placed on call start; blocks ONLY `lead_recovery` messages. Released on call end. |
| **4. Locked Call Desk Wizard** | **BUILT** | `src/app/reception/call-desk/page.tsx` | Wizard prefilled with caller phone; phone input locked to prevent staff misdialing. |
| **4. Call Outcomes Logging** | **BUILT** | `POST /api/v1/reception/call-desk/outcomes` | Logs call outcome (`booked`, `callback_requested`, `dropped`, etc.) to `call_logs`. |
| **4. Dropped Call Lead Handling** | **BUILT** | `reception_service.py:record_call_outcome` | Creates unconverted lead ONLY if contact details were collected during call. |
| **5. Phone Normalization (92...)** | **PARTIAL** | `phone_utils.py:normalize_pakistan_phone` | Normalizes valid Pakistani numbers to `92...`, but incorrectly prepends `92` to valid non-Pakistani numbers. |
| **5. Service Provider Fallback** | **BUILT** | `service_providers` join logic | If a service has no specific `service_providers` rows, all active clinic doctors are treated as eligible. |
| **5. Bookability Diagnostics** | **BUILT** | `/admin/bookability`, `/admin/services` | Admin pages provide diagnostics showing why services or clinics are not bookable. |
| **6. Integration API & Security** | **PARTIAL** | `integration.py`, `deps.py` | 14 endpoints built, authenticated via `mk_<64hex>` with scopes and audit. IP allowlist vulnerable to header spoofing. |
| **7. Out of Scope Respected** | **BUILT** | System codebase inspection | No WhatsApp/SMS dispatch built; no patient auth or payment changes introduced. |

### H2. Real-World Clinic Operational Gaps (Missing from Spec)
1. **Patient Self-Service Rescheduling/Cancellation Window**: The spec provides endpoints for automation rescheduling, but specifies no public cancellation policy or notice window (e.g., minimum 24 hours prior to appointment).
2. **Multi-Currency and Deposit Handling**: While services have `fee` values, no deposit or prepayment workflow exists for high-value dental procedures (e.g., implants, orthodontics).
3. **Communication Channel Preferences**: The model assumes SMS/WhatsApp fallback sequencing without recording patient-declared channel preferences (e.g., "Do not call", "WhatsApp only").
4. **Calendar Export (.ics)**: The public confirmation step provides reference text and clinic details, but lacks a standard `.ics` / Google Calendar direct export button.
5. **Task Table Relationship**: The `tasks` table has no `lead_id` foreign key. Tasks created from cold leads or failed conversions store the lead identifier only inside the text `description`, preventing relational queries, cascades, and clean indexing.

### H3. Spec Contradictions
1. **Wizard Step Sequencing**: Spec Section 1 strictly mandates a 6-step sequence: `(1) contact, (2) service, (3) clinic, (4) doctor, (5) notes, (6) review`. A later informal addendum requested a city-first waterfall (`contact, service, city, clinic, doctor, slots, review`). This led to two conflicting code paths: `booking-wizard.tsx` vs `progressive-booking-flow.tsx`.
2. **Appointment Triage vs Auto-Confirmation**: Spec Section 1 states: *"Online bookings are confirmed immediately (setting auto_confirm_online, default true; if off they arrive as 'requested')"*. However, reception triage queues in `/reception/appointments/requests` do not clearly distinguish between unconfirmed online requests and unconfirmed phone bookings.

---

## Questions for the Project Owner

1. **Public Booking Wizard Architecture**: The working tree has two competing booking flows: `booking-wizard.tsx` (the tracked, fully tested 6-step flow) and `progressive-booking-flow.tsx` (an untracked 3-page waterfall flow). Which design is the intended canonical public booking interface?
2. **Unrequested Motion Library**: Framer Motion was introduced across 23 files, including global layouts and shared cards, introducing a syntax crash on `/reception`. Should this animation layer be kept and fixed, or removed in favor of standard CSS to reduce bundle bloat and ensure test reliability?
3. **Database-Level CHECK Constraints**: Do you want Alembic migrations created to enforce database-level `CHECK` constraints on `leads.status`, `bookings.status`, and `call_logs.outcome`, or should validation remain solely within Pydantic and Python enums?
4. **Relational Task Linkage**: Should we add a nullable `lead_id` foreign key column to the `tasks` table so reception call tasks are relationally linked to leads rather than parsed from text descriptions?
5. **Reverse Proxy & IP Allowlist Trust**: What reverse proxy or ingress gateway (e.g., Nginx, Cloudflare, AWS ALB) will Marlow use in production? Should `deps.py` be configured with a trusted proxy list before accepting `X-Forwarded-For` for IP allowlisting?
6. **International Phone Number Handling**: Should the normalization utility reject non-Pakistani numbers, or preserve them with their international country code instead of prepending `92`?
