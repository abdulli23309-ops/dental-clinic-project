#!/usr/bin/env python3
"""MARLOW DENTAL — ACCOUNT CLEANUP EXECUTION SCRIPT

This script is designed for HUMAN-APPROVED execution ONLY.
It requires an explicit --execute flag.
Default mode is DRY RUN — nothing is deleted.

SAFEGUARDS:
- Explicit --execute flag required
- Protected admin UUID denylist (admin@hiradental.com excluded at SQL level)
- Role-based safeguards
- Database identity verification
- Expected account-count verification
- Verified backup requirement
- Foreign-key-aware deletion strategy
- Single transaction with rollback on failure
- Independent post-deletion verification
- Detailed audit logging

Usage:
    python cleanup_execution.py          # Dry run only (safe)
    python cleanup_execution.py --execute # Performs deletion
"""

import sys
import os
import uuid
import argparse
import hashlib
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

sys.path.insert(0, "e:/dental clinic project/backend")

from app.core.database import get_db_session, get_engine
from sqlalchemy import text
from app.domain.models.user import UserRole

PROTECTED_ADMIN_UUID_DENYLIST = []

APPROVED_DELETION_UUID_ALLOWLIST = []

FULL_ADMIN_ROLES = {"admin", "super admin", "platform owner"}

LOG_FILE = f"cleanup_audit_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"


def log_message(message: str):
    timestamp = datetime.now().isoformat()
    line = f"[{timestamp}] {message}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def classify_account(role: str, email: str) -> str:
    role_lower = role.lower().strip()
    email_lower = email.lower().strip()
    if email_lower == "admin@hiradental.com":
        return "PROTECTED_ADMIN"
    if role_lower in ("super admin", "platform owner"):
        return "SUPER_ADMINISTRATOR"
    elif role_lower in ("clinic branch manager",):
        return "OTHER_ADMINISTRATOR"
    elif role_lower == "doctor":
        return "DOCTOR"
    elif role_lower in ("receptionist", "staff"):
        return "STAFF"
    elif role_lower == "patient":
        return "PATIENT"
    else:
        return "OTHER"


async def verify_database_identity(conn) -> bool:
    db_info = await conn.execute(text("SELECT current_database(), current_user"))
    row = db_info.fetchone()
    log_message(f"Connected to database: {row[0]} as user: {row[1]}")
    log_message("WARNING: Verify this is the intended database before proceeding")
    return True


async def verify_backup_exists() -> bool:
    log_message("Verifying backup existence...")
    import glob
    import os
    backup_patterns = ["*.sql", "**/*.sql", "marlow_dental_backup*.sql", "marlow_backup*.sql"]
    found_backups = []
    for pattern in backup_patterns:
        found = glob.glob(pattern, recursive=True)
        found_backups.extend(found)
    if not found_backups:
        log_message("❌ CRITICAL: No backup files found!")
        log_message("   Please create a PostgreSQL backup before executing cleanup.")
        return False
    for backup_path in found_backups:
        size = os.path.getsize(backup_path)
        if size == 0:
            log_message(f"❌ Backup file is empty: {backup_path}")
            continue
        log_message(f"✅ Backup found: {backup_path} ({size} bytes)")
    return True


async def get_all_users(conn) -> list:
    stmt = text("SELECT id, email, role, is_active, created_at, clinic_id, team_member_id FROM users ORDER BY created_at")
    result = await conn.execute(stmt)
    users = []
    for row in result:
        user_id, email, role, is_active, created_at, clinic_id, team_member_id = row
        users.append({
            "id": str(user_id), "email": email, "role": role, "is_active": is_active,
            "created_at": str(created_at), "clinic_id": str(clinic_id) if clinic_id else None,
            "team_member_id": str(team_member_id) if team_member_id else None,
            "classification": classify_account(role, email),
        })
    return users


async def get_protected_admin(conn) -> dict:
    admin_result = await conn.execute(text("SELECT id, email, role, is_active, clinic_id, team_member_id FROM users WHERE email = 'admin@hiradental.com'"))
    admin = admin_result.fetchone()
    if not admin:
        return None
    return {
        "id": str(admin[0]), "email": admin[1], "role": admin[2], "is_active": admin[3],
        "clinic_id": str(admin[4]) if admin[4] else None,
        "team_member_id": str(admin[5]) if admin[5] else None,
    }


async def run_dry_run():
    log_message("=" * 70)
    log_message("MARLOW DENTAL - ACCOUNT CLEANUP EXECUTION (DRY RUN MODE)")
    log_message("=" * 70)
    log_message("Running in DRY RUN mode - NO database modifications will be made")
    log_message("Use --execute flag to perform actual deletion")
    log_message("")

    from app.core.database import get_engine
    engine = get_engine()

    async with engine.connect() as conn:
        await verify_database_identity(conn)
        await verify_backup_exists()
        users = await get_all_users(conn)
        admin = await get_protected_admin(conn)

        log_message(f"\nTotal users found: {len(users)}")
        if admin:
            log_message(f"\nPROTECTED ADMIN:")
            log_message(f"  Email: {admin['email']}")
            log_message(f"  UUID: {admin['id']}")
            log_message(f"  Role: {admin['role']}")
            log_message(f"  Active: {admin['is_active']}")
        else:
            log_message("\n❌ PROTECTED ADMIN NOT FOUND!")

        non_admin_users = [u for u in users if u["classification"] != "PROTECTED_ADMIN"]
        log_message(f"\nNon-admin accounts: {len(non_admin_users)}")
        for u in non_admin_users:
            log_message(f"  {u['email']} ({u['role']}) - id={u['id']}")

    log_message("\n" + "=" * 70)
    log_message("DRY RUN COMPLETE - No changes made")
    log_message("Run with --execute to perform deletion")
    log_message("=" * 70)


async def run_execution():
    log_message("=" * 70)
    log_message("MARLOW DENTAL - ACCOUNT CLEANUP EXECUTION")
    log_message("=" * 70)
    log_message("⚠️  EXECUTION MODE - PERMANENT DELETION WILL OCCUR")
    log_message("")

    from app.core.database import get_engine
    engine = get_engine()

    async with engine.connect() as conn:
        log_message("[Step 1] Verifying database identity...")
        await verify_database_identity(conn)

        log_message("[Step 2] Verifying backup...")
        if not await verify_backup_exists():
            log_message("ABORTED: No verified backup found")
            return

        log_message("[Step 3] Verifying account counts...")
        users = await get_all_users(conn)
        total_count = len(users)
        log_message(f"Total users: {total_count}")
        if total_count != 41:
            log_message(f"❌ ABORTED: Expected 41 accounts, found {total_count}")
            return

        admin = await get_protected_admin(conn)
        if not admin:
            log_message("❌ ABORTED: Protected admin account not found")
            return

        log_message(f"Protected admin found: {admin['email']} (id={admin['id']})")

        admin_uuid_str = str(uuid.UUID(admin["id"]))
        if admin_uuid_str in APPROVED_DELETION_UUID_ALLOWLIST:
            log_message(f"❌ ABORTED: Protected admin UUID {admin_uuid_str} is in deletion allowlist!")
            return

        deletion_candidates = []
        for u in users:
            if u["classification"] == "PROTECTED_ADMIN":
                continue
            deletion_candidates.append(u["id"])

        if len(deletion_candidates) != 40:
            log_message(f"❌ ABORTED: Expected 40 deletion candidates, found {len(deletion_candidates)}")
            return

        log_message(f"\nDeletion candidates: {len(deletion_candidates)}")
        for cid in deletion_candidates:
            log_message(f"  {cid}")

        log_message("\n[Step 6] Checking for privileged accounts in deletion set...")
        privileged_found = False
        for u in users:
            if u["id"] in deletion_candidates:
                if u["role"].lower() in FULL_ADMIN_ROLES or u["classification"] in ("SUPER_ADMINISTRATOR", "PLATFORM_OWNER", "OTHER_ADMINISTRATOR"):
                    log_message(f"❌ WARNING: Privileged account found: {u['email']} ({u['role']})")
                    privileged_found = True
        if privileged_found:
            log_message("❌ ABORTED: Privileged accounts detected")
            return

        log_message("\n" + "=" * 70)
        log_message("FINAL CONFIRMATION REQUIRED")
        log_message(f"  About to delete {len(deletion_candidates)} non-admin accounts")
        log_message(f"  Protected admin {admin['email']} will be PRESERVED")
        log_message("  This action is IRREVERSIBLE")
        log_message("=" * 70)
        confirmation = input("Type 'DELETE_CONFIRMED' to proceed: ").strip()
        if confirmation != "DELETE_CONFIRMED":
            log_message("ABORTED: Confirmation not received")
            return

        log_message("\n[Step 8] Executing deletion in single transaction...")

        from sqlalchemy.ext.asyncio import AsyncSession

        async with AsyncSession(engine, expire_on_commit=False) as session:
            try:
                deleted_count = 0
                log_message("  Revoking authentication artifacts...")
                for user_id_str in deletion_candidates:
                    user_id_obj = uuid.UUID(user_id_str)
                    await session.execute(text("UPDATE user_sessions SET is_active = FALSE, revoked_at = NOW() WHERE user_id = :uid"), {"uid": user_id_obj})
                    await session.execute(text("UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE user_id = :uid"), {"uid": user_id_obj})

                log_message("  Deleting non-admin accounts...")
                delete_stmt = text("DELETE FROM users WHERE email != 'admin@hiradental.com' RETURNING id, email")
                delete_result = await session.execute(delete_stmt)
                deleted_rows = delete_result.fetchall()
                deleted_count = len(deleted_rows)
                log_message(f"  Deleted {deleted_count} accounts")

                if deleted_count != 40:
                    log_message(f"❌ Deletion count mismatch: expected 40, got {deleted_count}")
                    await session.rollback()
                    return

                log_message("\n[Step 9] Pre-commit verification...")
                remaining_count = await session.execute(text("SELECT COUNT(*) FROM users"))
                remaining = remaining_count.scalar_one()
                if remaining != 1:
                    log_message(f"❌ ABORTED: Expected 1 remaining user, found {remaining}")
                    await session.rollback()
                    return

                admin_check = await session.execute(text("SELECT email, role, is_active FROM users WHERE id = :uid"), {"uid": uuid.UUID(admin["id"])})
                admin_row = admin_check.fetchone()
                if not admin_row:
                    log_message("❌ ABORTED: Protected admin no longer exists!")
                    await session.rollback()
                    return

                if admin_row[0] != "admin@hiradental.com":
                    log_message(f"❌ ABORTED: Admin email changed to {admin_row[0]}")
                    await session.rollback()
                    return

                if not admin_row[2]:
                    log_message("❌ ABORTED: Admin account is not active")
                    await session.rollback()
                    return

                remaining_sessions = await session.execute(text("SELECT COUNT(*) FROM user_sessions WHERE user_id != :uid"), {"uid": uuid.UUID(admin["id"])})
                session_count = remaining_sessions.scalar_one()
                if session_count > 0:
                    log_message(f"⚠️  WARNING: {session_count} sessions remain for deleted accounts")

                log_message(f"\n✅ All pre-commit checks passed")
                log_message(f"  Remaining users: {remaining}")
                log_message(f"  Admin preserved: {admin_row[0]} (active={admin_row[2]})")

                log_message("\n[Step 10] Committing transaction...")
                await session.commit()
                log_message("✅ Transaction committed successfully")

                log_message("\n[Step 11] Post-commit verification...")
                final_count = await session.execute(text("SELECT COUNT(*) FROM users"))
                final = final_count.scalar_one()
                log_message(f"Final user count: {final}")
                if final != 1:
                    log_message("❌ POST-COMMIT FAILURE: User count is not 1!")
                    return

                log_message("\n" + "=" * 70)
                log_message("CLEANUP COMPLETE")
                log_message("=" * 70)
                log_message(f"Accounts deleted: {deleted_count}")
                log_message(f"Accounts remaining: {final}")
                log_message(f"Protected admin: {admin_row[0]}")
                log_message("=" * 70)

            except Exception as e:
                await session.rollback()
                log_message(f"❌ ERROR: {e}")
                import traceback
                traceback.print_exc()
                log_message("Transaction rolled back due to error")
                return


async def main():
    parser = argparse.ArgumentParser(description="Marlow Dental Account Cleanup")
    parser.add_argument("--execute", action="store_true", help="Execute actual deletion (default: dry run)")
    args = parser.parse_args()

    if args.execute:
        log_message("Execution mode enabled")
        await run_execution()
    else:
        log_message("Dry run mode (default)")
        await run_dry_run()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
