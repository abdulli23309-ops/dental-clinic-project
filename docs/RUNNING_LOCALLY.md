# Running Marlow Dental Practice Locally

Complete step-by-step developer and operator guide for bootstrapping, seeding, verifying, and running the Marlow Dental Practice Management System.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Python**: `3.11` to `3.14`
- **PostgreSQL**: PostgreSQL 15+ database running locally or in Docker
- **Git**: Working copy of the repository

---

## 2. Quickstart Commands

### A. Environment Configuration

1. **Backend Environment** (`backend/.env`):
   ```env
   ENVIRONMENT=development
   DEBUG=true
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dentai_dev
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   JWT_SECRET_KEY=dev-marlow-dental-insecure-secret-key-change-in-production-2026
   SCHEDULER_ENABLED=false
   CLINICAL_DOCUMENTS_ENABLED=true
   ```

2. **Frontend Environment** (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

### B. Database Migration & Alembic Sync

Run migrations to ensure your local schema is at the single canonical head:
```bash
cd backend
.\.venv\Scripts\alembic upgrade head
```
Expected output:
```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
<head_revision> (head)
```

### C. Seed Realistic Demo Data

Seed complete operational clinic data (hours, planned closures, clinicians, 15 patients with minor/guardian, bookings in every status, alerts, clinical notes, payments, and simulated reminders):
```bash
# Optional: Set custom passwords in your environment
$env:DEMO_ADMIN_PASSWORD=<custom-admin-password>
$env:DEMO_RECEPTIONIST_PASSWORD=<custom-reception-password>
$env:DEMO_DOCTOR_PASSWORD=<custom-doctor-password>

# Run idempotent demo seed
python -m app.cli seed-demo
```
> [!NOTE]
> If environment variables are omitted, secure random passwords are generated and printed once to the console. They are never written to disk or git history.

### D. Verify System Health (`doctor` command)

Verify database connectivity, schema tables, Alembic head, doctor-clinician linkage, and CORS setup:
```bash
python -m app.cli doctor
```
Expected output:
```text
============================================================
 Marlow Dental Practice Management — Environment Doctor 
============================================================
[PASS] Database Connection: Reachable and responsive (PostgreSQL).
[PASS] Alembic Migration: Exactly 1 head, DB synchronized at head.
[PASS] Required Database Tables: All core clinical and administrative tables present.
[PASS] Seed Data: Present (users, patients, bookings).
[PASS] Doctor Clinician Linkage: All doctor accounts mapped to active clinical team members.
[PASS] Messaging Provider: Configured in 'simulated' mode.
[PASS] Reminder Scheduler: Flag is DISABLED (Interval: 60s).
[PASS] Feature Flags: Payments=ON, QuietHours=ON.
[PASS] Version & Git Branch: Version Marlow Dental API (branch: 'feat/clinical-workflows').
[PASS] CORS Origins: Validated for frontend host (['http://localhost:3000', 'http://127.0.0.1:3000']).
============================================================
Overall Environment Status: PASS (10/10 checks passed)
============================================================
```

### E. Start Backend Dev Server

```bash
cd backend
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at `http://localhost:8000`. Interactive OpenAPI documentation available at `http://localhost:8000/docs`.

### F. Start Frontend Dev Server

```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 3. Seeded Demo Accounts & Credentials

| Role | Email | Clinician / Team Link | Accessible Workspaces |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@marlowdental.com` | Dr. Sarah Marlow | `/admin`, `/reception`, `/doctor` |
| **Receptionist** | `receptionist@marlowdental.com` | Front Office Desk | `/reception` |
| **Doctor (Marcus)** | `doctor@marlowdental.com` | Dr. Marcus Vance | `/doctor` |
| **Doctor (Sarah)** | `dr.sarah@marlowdental.com` | Dr. Sarah Marlow | `/doctor` |

---

## 4. Integration Clients & Automation Bot Key (Part BF13)

When `seed-demo` runs, it creates a demo integration client for testing automated workflows (WhatsApp bot, telephony IVR, or external web services). It generates a key at runtime and prints it once to stdout (or reads `MARLOW_DEMO_INTEGRATION_KEY` from your environment):

```http
X-Marlow-Key: <key-printed-by-seed-demo>
```

| Client Name | Scopes | Authentication Header |
| :--- | :--- | :--- |
| **Demo Integration Bot** | `bookings:read`, `bookings:write`, `leads:read`, `leads:write`, `messages:write`, `lookup:read` | `X-Marlow-Key: <key-printed-by-seed-demo>` |

### Managing Integration Clients
- Navigate to `/admin/integrations` as an Administrator.
- View all active clients, key prefixes, and assigned scopes.
- Generate new random 32-byte API keys (displayed only once).
- Rotate or revoke existing API keys instantly.
- Test endpoints directly with HTTP: see `docs/integration_api.http` or `docs/INTEGRATION_API.md`.

---

## 5. Running from a Fresh Database

Never run `alembic downgrade base` on your active development database. To start from a clean slate, create a fresh database instead:

```bash
# 1. Create a fresh PostgreSQL database
psql -U postgres -h localhost -p 5433 -c "CREATE DATABASE dental_fresh;"

# 2. Configure DATABASE_URL in backend/.env to point to dental_fresh

# 3. Upgrade to canonical head
cd backend
alembic upgrade head

# 4. Seed demo dataset (includes organizations, clinics, clinicians, patients, bookings, leads, holds, and integration client)
python -m app.cli seed-demo

# 5. Run system health doctor
python -m app.cli doctor
```

### Test Database Isolation (`marlow_test`)

Automated test suites (`pytest` and Playwright) run against a separate, isolated test database (`marlow_test`) so the development database remains clean with exact seed counts:

```bash
# Run test database setup script (creates, migrates, and seeds marlow_test)
python backend/scripts/setup_test_db.py
```

---

## 6. Troubleshooting & "Why Can't I See Feature X?" Checklist

If an expected button, patient, tab, or appointment is missing from your screen, check this diagnosis tree:

### 1. Database Not Migrated
- **Symptom**: 500 Internal Server Error, `UndefinedTableError`, or missing column error in backend logs.
- **Fix**: Run `.\.venv\Scripts\alembic upgrade head`. Check revision using `python -m app.cli doctor`.

### 2. Wrong Database or Connection
- **Symptom**: Seeded records do not appear, or login returns `401 Unauthorized`.
- **Fix**: Check `DATABASE_URL` in `backend/.env`. Ensure you are connecting to `dentai_dev` and not a test database or another container.

### 3. Stale Servers Running in Background
- **Symptom**: Changes to Python or Next.js code do not take effect, or port 8000/3000 is occupied.
- **Fix**: Terminate old Node.js or Uvicorn background tasks. In PowerShell:
  ```powershell
  Get-Process -Name "python", "node" | Stop-Process -Force
  ```

### 4. Wrong User Role Logged In
- **Symptom**: 403 Forbidden toast or redirected away from `/admin`, `/doctor`, or `/reception`.
- **Diagnosis**:
  - The Doctor portal (`/doctor`) requires role `doctor` or `admin`.
  - The Reception portal (`/reception`) requires role `receptionist` or `admin`.
  - The Admin portal (`/admin`) requires role `admin`.
- **Fix**: Log out via top right avatar and log in with the correct user role.

### 5. Doctor Not Linked to Team Member
- **Symptom**: On `/doctor`, daily schedule shows 0 appointments or error "No clinician profile linked".
- **Diagnosis**: Doctor user accounts must have `team_member_id` referencing a `team_members` row.
- **Fix**: Run `python -m app.cli doctor` to verify linkage, or re-run `python -m app.cli seed-demo`.

### 6. Operational Feature Flags Disabled
- **Symptom**: Billing tab missing, payment recording disabled, or quiet hours banner not showing.
- **Fix**: Check `payments_enabled` and `quiet_hours_enabled` in `ClinicBookingSettingsORM` via `/admin/booking` or `/admin/settings`.

### 7. Missing Demo Seed Data
- **Symptom**: Tables render empty state ("No patients found", "No appointments for today").
- **Fix**: Run `python -m app.cli seed-demo`.
