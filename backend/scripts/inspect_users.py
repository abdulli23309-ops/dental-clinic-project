#!/usr/bin/env python3
"""Classify all user accounts in the database."""
import sys
import asyncio
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import get_session_factory
from app.core.database import _session_factory, _engine
from sqlalchemy import text

PROTECTED_EMAIL = "admin@hiradental.com"

async def main():
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(text("SELECT id, email, role, is_active, clinic_id, team_member_id, created_at FROM users ORDER BY email"))
        users = result.fetchall()
        print(f"Total users: {len(users)}")
        print("=" * 100)
        
        for u in users:
            print(f"id={u.id}")
            print(f"  email={u.email}")
            print(f"  role={u.role}")
            print(f"  active={u.is_active}")
            print(f"  clinic_id={u.clinic_id}")
            print(f"  team_member_id={u.team_member_id}")
            print(f"  created_at={u.created_at}")
            print()

if __name__ == "__main__":
    asyncio.run(main())