#!/usr/bin/env python3
"""MARLOW DENTAL — ACCOUNT CLEANUP DRY RUN

This script is a COMPLETELY READ-ONLY audit and inventory tool.
It NEVER modifies the database, runs any DELETE/UPDATE/INSERT/DROP/TRUNCATE/ALTER statements,
and NEVER prints password hashes or sensitive secrets.

Usage:
    python cleanup_dry_run.py
"""

import sys
import os
import csv
import hashlib
from typing import Dict, List, Optional, Any, Tuple

sys.path.insert(0, "e:/dental clinic project/backend")

from app.core.database import get_db_session, get_engine
from sqlalchemy import text, select
from app.infrastructure.database.orm_models import UserORM, RefreshTokenORM, UserSessionORM, PatientORM, ActivityLogORM
from app.domain.models.user import UserRole


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


def inspect_database():
    result = {
        "connection": {},
        "users": [],
        "foreign_keys": [],
        "table_counts": {},
        "account_classification": {
            "PROTECTED_ADMIN": 0,
            "OTHER_ADMINISTRATOR": 0,
            "SUPER_ADMINISTRATOR": 0,
            "PLATFORM_OWNER": 0,
            "DOCTOR": 0,
            "STAFF": 0,
            "PATIENT": 0,
            "OTHER": 0,
            "UNKNOWN": 0,
        },
        "authentication_artifacts": {},
        "foreign_key_relationships": [],
        "errors": [],
    }

    from app.core.database import get_engine
    engine = get_engine()
    async with engine.connect() as conn:
        db_info = await conn.execute(text("SELECT current_database(), current_user, version()"))
        row = db_info.fetchone()
        result["connection"] = {
            "database": row[0],
            "user": row[1],
            "postgresql_version": row[2],
        }

        total_users = await conn.scalar(text("SELECT COUNT(*) FROM users"))
        result["total_users"] = total_users

        stmt = text("SELECT id, email, role, is_active, created_at, clinic_id, team_member_id FROM users ORDER BY created_at")
        result_stmt = await conn.execute(stmt)

        for row in result_stmt:
            user_id, email, role, is_active, created_at, clinic_id, team_member_id = row
            classification = classify_account(role, email)
            result["account_classification"][classification] += 1
            result["users"].append({
                "id": str(user_id),
                "email": email,
                "role": role,
                "is_active": is_active,
                "created_at": str(created_at),
                "clinic_id": str(clinic_id) if clinic_id else None,
                "team_member_id": str(team_member_id) if team_member_id else None,
                "classification": classification,
            })

        admin_result = await conn.execute(text("SELECT id, email, role, is_active, clinic_id, team_member_id FROM users WHERE email = 'admin@hiradental.com'"))
        admin = admin_result.fetchone()
        if admin:
            result["protected_admin"] = {
                "id": str(admin[0]),
                "email": admin[1],
                "role": admin[2],
                "is_active": admin[3],
                "clinic_id": str(admin[4]) if admin[4] else None,
                "team_member_id": str(admin[5]) if admin[5] else None,
            }
        else:
            result["protected_admin"] = None

        fk_result = await conn.execute(text("""
            SELECT tc.table_name, kc.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kc ON tc.constraint_name = kc.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
        """))
        for row in fk_result:
            result["foreign_key_relationships"].append({
                "local_table": row[0],
                "local_column": row[1],
                "foreign_table": row[2],
                "foreign_column": row[3],
            })

        for table in ["users", "user_sessions", "refresh_tokens", "password_reset_tokens", "activity_logs"]:
            count = await conn.scalar(text(f"SELECT COUNT(*) FROM {table}"))
            result["table_counts"][table] = count

        index_result = await conn.execute(text("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users'"))
        for row in index_result:
            result["index_details"].append({
                "index_name": row[0],
                "definition": row[1],
            })

        admin_role_result = await conn.execute(text("SELECT DISTINCT role FROM users WHERE email = 'admin@hiradental.com'"))
        role_rows = admin_role_result.fetchall()
        if role_rows:
            result["admin_role"] = role_rows[0][0]

async def main():
    print("=" * 70)
    print("  MARLOW DENTAL - ACCOUNT CLEANUP AUDIT")
    print("  READ-ONLY DRY RUN")
    print("=" * 70)
    print("\n  This script performs NO modifications to the database.")
    print("  No INSERT, UPDATE, DELETE, DROP, TRUNCATE, or ALTER statements are executed.")
    print("  No password hashes or secrets are displayed.")
    print("\n  Press Ctrl+C to abort at any time.\n")

    try:
        from app.core.database import get_engine
        engine = get_engine()
        result = await inspect_database()

        csv_path = "account_inventory.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["UUID", "Email", "Role", "Active", "Classification", "Created At", "Clinic ID", "Team Member ID"])
            for user in result.get("users", []):
                writer.writerow([user["id"], user["email"], user["role"], user["is_active"], user["classification"], user["created_at"], user.get("clinic_id", ""), user.get("team_member_id", "")])
        print(f"\n  CSV inventory written to: account_inventory.csv")

        print("\n" + "=" * 70)
        print("  FINAL SUMMARY")
        print("=" * 70)
        print(f"  Total accounts: {result['total_users']}")
        for classification, count in sorted(result["account_classification"].items()):
            print(f"  {classification}: {count}")
        print(f"  Protected admin: {'✅ Found' if 'protected_admin' in result and result['protected_admin'] else '❌ NOT FOUND'}")
        if result.get("errors"):
            print(f"  Errors: {result['errors']}")

    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
