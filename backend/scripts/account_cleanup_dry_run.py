import asyncio



"""
MARLOW DENTAL - ACCOUNT CLEANUP SCRIPT A: READ-ONLY DRY RUN
===========================================================

PURPOSE:
Performs a complete read-only audit of all user accounts in the database
without modifying any data. Generates an account inventory and reports
which accounts would be classified as deletion candidates.

SAFETY:
- Never executes INSERT, UPDATE, DELETE, DROP, TRUNCATE, or ALTER
- Never modifies database state in any way
- Provides clear read-only output

USAGE:
  python scripts/account_cleanup_dry_run.py
  python scripts/account_cleanup_dry_run.py --database marlow_test
"""

import argparse
import sys
from pathlib import Path
from typing import Optional
from typing import Dict, List

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.core.database import get_session_factory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

PROTECTED_ADMIN_EMAIL = "admin@hiradental.com"


def classify_account(role: str, email: str) -> str:
    """Classify account into a category."""
    role_lower = role.lower().strip()
    email_lower = email.lower().strip()

    if email_lower == PROTECTED_ADMIN_EMAIL:
        return "PROTECTED_ADMIN"

    if role_lower in ["superadmin", "super_admin", "platformowner", "platform_owner"]:
        return "SUPER_ADMINISTRATOR" if "super" in role_lower else "PLATFORM_OWNER"

    if role_lower in ["admin", "staff", "doctor", "patient"]:
        return role_lower.upper()

    if "doctor" in role_lower:
        return "DOCTOR"
    if "receptionist" in role_lower or "staff" in role_lower:
        return "STAFF"
    if "patient" in role_lower:
        return "PATIENT"
    if "clinician" in role_lower or "provider" in role_lower:
        return "STAFF"

    return "OTHER"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MARLOW DENTAL - Account Cleanup Read-Only Dry Run")
    parser.add_argument("--database", help="Database name override", default=None)
    args = parser.parse_args()

    import asyncio
    asyncio.run(run_dry_run(database=args.database))


async def run_dry_run(database: Optional[str] = None) -> None:
    """Run the read-only inventory and classification."""
    print("=" * 70)
    print("MARLOW DENTAL - ACCOUNT CLEANUP DRY RUN")
    print("=" * 70)

    # 1. Database identification
    conn_str = database or settings.database_url
    print(f"\n[1] Database identified: {conn_str}")

    # 2. Account census
    session_factory = get_session_factory(database=database)
    async with session_factory() as session:
        # Total count
        result = await session.execute(text("SELECT COUNT(*) FROM users"))
        total_count = result.scalar_one()
        print(f"\n[2] Total user accounts: {total_count}")

        # Admin verification
        result = await session.execute(
            text("SELECT id, email, role, is_active FROM users WHERE email = :email"),
            {"email": PROTECTED_ADMIN_EMAIL}
        )
        admins = result.fetchall()

        if len(admins) == 0:
            print("  [!] CRITICAL: Protected admin account not found!")
        elif len(admins) > 1:
            print(f"  [!] CRITICAL: Multiple admin accounts found: {len(admins)}")
        else:
            admin = admins[0]
            print(f"  [OK] Protected admin found:")
            print(f"       - ID: {admin.id}")
            print(f"       - Email: {admin.email}")
            print(f"       - Role: {admin.role}")
            print(f"       - Active: {admin.is_active}")

        # All users
        result = await session.execute(
            text("SELECT id, email, role, is_active FROM users ORDER BY email")
        )
        all_users = result.fetchall()

        print(f"\n[3] Account inventory ({len(all_users)} accounts):")
        print("-" * 70)
        print(f"{'ID':<40} {'EMAIL':<35} {'ROLE':<20} {'ACTIVE':<8} {'CLASSIFICATION'}")
        print("-" * 70)

        for user in all_users:
            classification = classify_account(user.role, user.email)
            print(f"{str(user.id):<40} {user.email:<35} {user.role:<20} {user.is_active!s:<8} {classification}")

        # Count by classification
        classifications: Dict[str, int] = {}
        for user in all_users:
            classification = classify_account(user.role, user.email)
            classifications[classification] = classifications.get(classification, 0) + 1

        print("\n[4] Classification summary:")
        for cls, count in sorted(classifications.items()):
            print(f"  - {cls}: {count}")

        # Admin-protected check
        print("\n[5] Safety checks:")
        print(f"  - Protected admin email configured: {PROTECTED_ADMIN_EMAIL}")
        print(f"  - Total accounts: {total_count}")
        print(f"  - Admin accounts found: {len(admins)}")
        print(f"  - Protection level: {'PASS' if len(admins) == 1 else 'FAIL'}")

    await session_factory.dispose()
    print("\n" + "=" * 70)
    print("DRY RUN COMPLETE - No database modifications performed")
    print("=" * 70)
#!/usr/bin/env python3
