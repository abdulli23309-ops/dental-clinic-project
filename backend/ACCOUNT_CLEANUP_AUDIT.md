# MARLOW DENTAL — ACCOUNT CLEANUP AUDIT REPORT

**Date:** 2026-11-04  
**Project:** Marlow Dental  
**Status:** READ-ONLY AUDIT AND SCRIPT PREPARATION  
**Classification:** RESTRICTED

---

## Executive Summary

This document presents read-only audit findings and script preparation for account cleanup. The objective is to permanently delete 40 non-admin login accounts while preserving exactly one protected administrator account: `admin@hiradental.com`.

**IMPORTANT:** No destructive database operations have been performed.

---

## A. Database Findings

| Item | Value |
|------|-------|
| Database Engine | PostgreSQL |
| ORM | SQLAlchemy (asyncpg driver) |
| User Table | `users` |
| Session Table | `user_sessions` |
| Refresh Token Table | `refresh_tokens` |

### Foreign Key Relationships Involving Users

| Local Table | Local Column | Foreign Table | Foreign Column | On Delete |
|-------------|--------------|---------------|----------------|-----------|
| `users` | `clinic_id` | `clinics` | `id` | SET NULL |
| `users` | `team_member_id` | `team_members` | `id` | SET NULL |
| `user_sessions` | `user_id` | `users` | `id` | CASCADE |
| `refresh_tokens` | `user_id` | `users` | `id` | CASCADE |
| `appointments` | `cancelled_by_user_id` | `users` | `id` | SET NULL |
| `integration_clients` | `created_by_user_id` | `users` | `id` | SET NULL |

### User Role Enum (`UserRole`)

| Role Value | Description |
|------------|-------------|
| `Platform Owner` | Platform-level super admin |
| `Super Admin` | Super administrator |
| `Clinic Branch Manager` | Clinic branch manager |
| `doctor` | Clinical doctor |
| `receptionist` | Reception staff |
| `admin` | Administrator |
| `patient` | Patient account |

### UUID Storage

All UUID columns use `Uuid(as_uuid=True)` SQLAlchemy type, mapping to PostgreSQL `UUID` type. Python `uuid.UUID` objects are used for all ID comparisons.

---

### Protected Account Details

| Field | Expected Value |
|-------|----------------|
| Email | `admin@hiradental.com` |
| UUID | To be verified during dry run |
| Role | Full Administrator (Admin/Super Admin/Platform Owner) |
| Active Status | True |
| Password Hash | Preserved (not modified) |
| Password Hash Fingerprint | SHA-256 of stored hash (not printed) |

### Multiple Safeguards for Admin Protection

1. **Application-level target selection:** Accounts with email `admin@hiradental.com` are classified as `PROTECTED_ADMIN` and excluded from deletion targets.

2. **SQL-level deletion conditions:** The DELETE statement uses `WHERE email != 'admin@hiradental.com'` ensuring the admin is excluded at the database level.

3. **UUID-level verification:** The protected admin UUID is checked against the deletion allowlist before any deletion occurs.

4. **Post-operation verification:** After deletion, the admin account's email, ID, active status, and role are re-verified.

---

## C. Account Classification

| Classification | Count | Description |
|----------------|-------|-------------|
| PROTECTED_ADMIN | 1 | `admin@hiradental.com` — must be preserved |
| SUPER_ADMINISTRATOR | TBD | Platform Owner / Super Admin roles |
| OTHER_ADMINISTRATOR | TBD | Clinic Branch Manager |
| DOCTOR | TBD | Clinical doctors |
| STAFF | TBD | Receptionist / Staff |
| PATIENT | TBD | Patient accounts |
| OTHER | TBD | Unrecognized roles |
| UNKNOWN | TBD | Uncertain classification |
| **TOTAL** | **41** | Expected initial count |

**Potential cleanup candidates:** 40 (all non-protected-admin accounts)

---

## D. Safety Findings

### Critical Defects Identified

1. **UUID comparison bug:** Comparing Python `UUID` objects with string UUIDs can fail, causing the admin to be deleted. **FIX:** Use `uuid.UUID()` normalization for all comparisons, and exclude admin at SQL level via `WHERE email != 'admin@hiradental.com'`.

2. **No backup verification:** Original script did not verify backup exists before deletion. **FIX:** Execution script verifies backup file existence and non-zero size before proceeding.

3. **Post-commit verification missing:** Original script verified state only after commit. **FIX:** Execution script performs pre-commit verification inside the transaction and rolls back if checks fail.

### High-Priority Defects

1. Password hash printed to logs — **FIX:** Never print or log password hashes; only SHA-256 fingerprints used.

2. Authentication table column names assumed — **FIX:** Script verifies actual schema by querying the database.

3. No human confirmation step — **FIX:** Execution script requires `DELETE_CONFIRMED` input before deleting.

### Authentication Artifact Handling

| Artifact | Action for Deleted Accounts | Action for Protected Admin |
|----------|----------------------------|---------------------------|
| User Sessions | Revoked (is_active = FALSE, revoked_at set) | Preserved (not touched) |
| Refresh Tokens | Revoked (is_revoked = TRUE) | Preserved (not touched) |
| Password Reset Tokens | Revoked/Deleted | Preserved (not touched) |

### Remaining Blockers

- **Database count not yet verified:** The dry run script must be executed first to confirm 41 total accounts.
- **Protected admin existence not yet confirmed:** Dry run will verify `admin@hiradental.com` exists.
- **No backup created yet:** Backup must be created before execution.

---

## E. Script Verification

| Script | Syntax Checked | Destructive Operations | Database Modifications |
|--------|---------------|----------------------|----------------------|
| `cleanup_dry_run.py` | Yes | None | None (read-only) |
| `cleanup_execution.py` | Yes | DELETE on `users` table | Only with `--execute` flag |

---

## F. Final Status

**READY FOR HUMAN REVIEW**

The account cleanup tooling has been prepared with multiple safeguards:
- Read-only dry run script for inspection
- Execution script with `--execute` flag requirement
- Multiple layers of admin protection (application, SQL, UUID, post-verification)
- Transaction-level rollback on any failure
- Backup verification before execution
- Human confirmation step required

**The task is NOT complete.** The database has not been modified. Human review and explicit authorization are required before running `cleanup_execution.py --execute`.

---

## Recommended Next Steps

1. Execute `cleanup_dry_run.py` to verify actual database state
2. Review `account_inventory.csv` for accurate account classification
3. Create PostgreSQL backup using `pg_dump`
4. Review and approve `cleanup_execution.py` safeguards
5. Run `cleanup_execution.py --execute` only after all safeguards verified
6. Verify final database state matches expected outcome
