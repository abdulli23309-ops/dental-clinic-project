# MARLOW DENTAL — BACKUP AND RECOVERY GUIDE

**Date:** 2026-11-04  
**Project:** Marlow Dental  
**Purpose:** Safe backup and recovery procedures for account cleanup operation

---

## A. Backup Creation (Windows Environment)

### Step 1: Identify Database Connection Details

Before creating a backup, identify the database connection settings from the application configuration:

- **Database URL source:** `app/core/config.py` — `DATABASE_URL` setting
- **Environment file:** `backend/.env` (if exists)
- **Database type:** PostgreSQL

### Step 2: Create Backup Using pg_dump

Run from PowerShell (Windows):

```powershell
# Navigate to backend directory
cd "e:/dental clinic project/backend"

# Create backup directory if needed
New-Item -ItemType Directory -Path "backups" -Force

# Get timestamp for backup filename
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\marlow_dental_backup_$timestamp.sql"

# Create database backup
pg_dump -U your_db_user -d your_db_name -f "$backupFile"

# Verify backup file exists and is non-empty
if (Test-Path $backupFile) {
    $size = (Get-Item $backupFile).Length
    Write-Host "Backup created: $backupFile ($size bytes)"
    if ($size -eq 0) {
        Write-Host "ERROR: Backup file is empty!"
    } else {
        Write-Host "Backup verification: PASSED"
    }
} else {
    Write-Host "ERROR: Backup file was not created!"
}
```

### Step 3: Alternative — Using pg_dump via Python

```python
import subprocess
import os
from datetime import datetime

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_file = f"backups/marlow_dental_backup_{timestamp}.sql"

os.makedirs("backups", exist_ok=True)

result = subprocess.run([
    "pg_dump",
    "-U", "your_db_user",
    "-d", "your_db_name",
    "-f", backup_file
], capture_output=True, text=True)

if result.returncode != 0:
    print(f"Backup failed: {result.stderr}")
else:
    size = os.path.getsize(backup_file)
    print(f"Backup created: {backup_file} ({size} bytes)")
```

### Step 4: Verify Backup Integrity

1. **File existence:** Confirm `.sql` file exists at the specified path
2. **Non-zero size:** File size must be greater than 0 bytes
3. **Readability:** Open file and confirm it contains SQL statements
4. **SQL syntax check:** `pg_dump` output should contain `CREATE TABLE`, `COPY`, or `INSERT` statements

### Step 5: Store Backup Securely

- Store backup outside publicly accessible application directories
- Do not commit backup files to source control (Git)
- Recommended location: `backend/backups/` (gitignored) or external storage
- Record backup path in cleanup audit log

---

## B. Backup Restoration (Isolated Environment Only)

**WARNING:** Never restore a backup against the production database without explicit authorization.

### Step 1: Create Test Database

```powershell
# Create a test database for restoration verification
createdb -U your_db_user marlow_dental_test
```

### Step 2: Restore Backup to Test Database

```powershell
pg_restore -U your_db_user -d marlow_dental_test backups/marlow_dental_backup_yyyyMMdd_HHmmss.sql
```

### Step 3: Verify Restoration

- Confirm all tables exist in test database
- Verify user count matches production
- Verify admin@hiradental.com account exists in test database
- Confirm foreign key relationships are intact

---

## C. Backup Verification Checklist

| Check | Method | Pass/Fail |
|-------|--------|-----------|
| Backup file exists | `Test-Path` | ☐ |
| File size > 0 bytes | Check file properties | ☐ |
| File contains SQL | Open file, look for `CREATE TABLE` | ☐ |
| Backup is restorable | Restore to test database | ☐ |
| Test database user count matches | Query test database | ☐ |
| Admin account exists in test | Query test database | ☐ |

---

## D. Rollback Procedures

If the account cleanup operation fails or produces unexpected results:

### Option 1: Transaction Rollback (During Execution)

The cleanup execution script uses a single database transaction. If any pre-commit verification fails, the transaction is automatically rolled back, and no changes are persisted.

### Option 2: Restore from Backup (After Commit)

If the cleanup has been committed and issues are discovered:

```powershell
# Stop the application
# Restore from verified backup
pg_restore -U your_db_user -d your_db_name backups/marlow_dental_backup_yyyyMMdd_HHmmss.sql --clean --if-exists
# Restart the application
```

**WARNING:** Restoring from backup will revert ALL changes made since the backup was created, not just the account cleanup.

---

## E. Security Considerations

- **Never expose database credentials** in scripts, reports, or terminal output
- **Store backup files securely** — outside web-accessible directories
- **Do not commit backup files** to Git or any version control system
- **Verify backup integrity** before relying on it for recovery
- **Document all backup operations** in the cleanup audit log

---

## F. Emergency Contacts

| Role | Contact |
|------|---------|
| Database Administrator | TBD |
| Application Owner | TBD |
| Security Officer | TBD |
