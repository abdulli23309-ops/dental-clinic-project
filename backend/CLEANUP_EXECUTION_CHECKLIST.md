# MARLOW DENTAL — CLEANUP EXECUTION CHECKLIST

**Date:** 2026-11-04  
**Project:** Marlow Dental  
**Purpose:** Step-by-step checklist for account cleanup execution

---

## Pre-Execution Checklist

### Phase 1: Preparation

- [ ] **Dry run script created:** `cleanup_dry_run.py`
- [ ] **Execution script created:** `cleanup_execution.py`
- [ ] **Audit report created:** `ACCOUNT_CLEANUP_AUDIT.md`
- [ ] **Backup guide created:** `BACKUP_AND_RECOVERY_GUIDE.md`
- [ ] **This checklist created:** `CLEANUP_EXECUTION_CHECKLIST.md`

### Phase 2: Dry Run Verification

- [ ] Execute `cleanup_dry_run.py`
- [ ] Verify output shows expected account count (41)
- [ ] Verify protected admin `admin@hiradental.com` is found
- [ ] Verify admin is active and has full-admin role
- [ ] Verify exactly 40 non-admin accounts are identified as deletion candidates
- [ ] Review `account_inventory.csv` for accurate classification
- [ ] Confirm no errors reported in dry run output

### Phase 3: Backup Creation

- [ ] Identify database connection details from `app/core/config.py`
- [ ] Create PostgreSQL backup using `pg_dump`
- [ ] Verify backup file exists and is non-empty
- [ ] Verify backup can be read (contains SQL statements)
- [ ] Record backup file path in audit log
- [ ] Store backup outside publicly accessible directories

### Phase 4: Safety Review

- [ ] Confirm protected admin UUID is NOT in deletion allowlist
- [ ] Confirm no privileged accounts are in deletion candidates
- [ ] Confirm foreign key relationships are understood (SET NULL for users.clinic_id, users.team_member_id; CASCADE for user_sessions.user_id, refresh_tokens.user_id)
- [ ] Confirm clinical data tables will NOT be affected
- [ ] Confirm admin account sessions/refresh tokens will NOT be revoked

---

## Execution Checklist

### Phase 5: Execution

- [ ] Run `cleanup_execution.py --execute`
- [ ] Enter `DELETE_CONFIRMED` when prompted
- [ ] Monitor output for any warnings or errors
- [ ] Verify all pre-commit checks pass
- [ ] Verify transaction commits successfully

### Phase 6: Post-Execution Verification

- [ ] Verify exactly 1 user remains in database
- [ ] Verify remaining user is `admin@hiradental.com`
- [ ] Verify admin UUID is unchanged from before cleanup
- [ ] Verify admin password hash is unchanged
- [ ] Verify admin account is active
- [ ] Verify admin has full-admin role
- [ ] Verify no other user accounts exist
- [ ] Verify no active sessions remain for deleted accounts
- [ ] Verify no refresh tokens remain for deleted accounts
- [ ] Verify clinical data tables are intact (patient count, appointments, etc.)
- [ ] Verify no orphaned foreign-key relationships

### Phase 7: Admin Frontend Verification

- [ ] Admin login page accepts existing admin credentials
- [ ] Admin successfully authenticates
- [ ] Admin dashboard loads
- [ ] Admin has access to account-management section
- [ ] Account list displays exactly one account: `admin@hiradental.com`
- [ ] Admin can access create-account workflow
- [ ] Backend correctly persists newly created accounts (test environment)
- [ ] New account appears in admin account list (test environment)
- [ ] New account can authenticate (test environment)

---

## Abort Conditions

STOP IMMEDIATELY if any of the following occur:

- [ ] Total user count is NOT 41 before cleanup
- [ ] `admin@hiradental.com` account is missing
- [ ] Multiple accounts match `admin@hiradental.com`
- [ ] Admin account is not active
- [ ] Admin does not have full-admin role
- [ ] Backup file is missing or empty
- [ ] Deletion candidate count is NOT 40
- [ ] Protected admin UUID appears in deletion allowlist
- [ ] Privileged accounts found in deletion candidates
- [ ] Pre-commit verification fails
- [ ] Post-commit user count is NOT 1
- [ ] Admin cannot log in after cleanup

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Database Administrator | | | |
| Security Officer | | | |
| Application Owner | | | |
