#!/usr/bin/env python3
"""
Marlow Dental — Test Database Setup Script
Creates and migrates an isolated PostgreSQL database (marlow_test) for pytest and Playwright test suites.
Never touches or pollutes the development database (dental_dev).
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path
import asyncpg


DB_USER = os.environ.get("POSTGRES_USER", "postgres")
DB_PASS = os.environ.get("POSTGRES_PASSWORD", os.environ.get("DB_PASSWORD", ""))
if not DB_PASS:
    env_p = Path(__file__).resolve().parent.parent / ".env"
    if env_p.exists():
        import re
        for line in env_p.read_text(encoding="utf-8").splitlines():
            if line.startswith("DATABASE_URL="):
                m = re.search(r"://[^:]+:([^@]+)@", line)
                if m:
                    DB_PASS = m.group(1)
                    break
DB_HOST = os.environ.get("POSTGRES_HOST", "localhost")
DB_PORT = os.environ.get("POSTGRES_PORT", "5433")
AUTH_PART = f"{DB_USER}:{DB_PASS}@" if DB_PASS else f"{DB_USER}@"

POSTGRES_ADMIN_URL = os.environ.get(
    "POSTGRES_ADMIN_URL",
    f"postgresql://{AUTH_PART}{DB_HOST}:{DB_PORT}/postgres",
)
TEST_DB_NAME = "marlow_test"
TEST_DB_ASYNC_URL = os.environ.get(
    "MARLOW_TEST_DATABASE_URL",
    f"postgresql+asyncpg://{AUTH_PART}{DB_HOST}:{DB_PORT}/{TEST_DB_NAME}",
)


async def create_database_if_not_exists():
    import re
    masked_admin = re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", POSTGRES_ADMIN_URL)
    print(f"Connecting to PostgreSQL admin: {masked_admin}...")
    conn = await asyncpg.connect(POSTGRES_ADMIN_URL)
    try:
        # Terminate any active connections to the test database
        await conn.execute(
            """
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = $1
              AND pid <> pg_backend_pid();
            """,
            TEST_DB_NAME,
        )

        # Check if database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", TEST_DB_NAME
        )
        if exists:
            print(f"Database '{TEST_DB_NAME}' exists. Dropping for a clean test environment...")
            await conn.execute(f'DROP DATABASE "{TEST_DB_NAME}"')

        print(f"Creating pristine database '{TEST_DB_NAME}'...")
        await conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
        print(f"[OK] Database '{TEST_DB_NAME}' created successfully.")
    finally:
        await conn.close()


def run_migrations_and_seed():
    backend_dir = Path(__file__).resolve().parent.parent
    env = os.environ.copy()
    env["DATABASE_URL"] = TEST_DB_ASYNC_URL
    env["MARLOW_TEST_DATABASE_URL"] = TEST_DB_ASYNC_URL

    print(f"\nRunning Alembic migrations against {TEST_DB_NAME}...")
    mig_res = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(backend_dir),
        env=env,
        capture_output=True,
        text=True,
    )
    if mig_res.returncode != 0:
        print(f"[ERROR] Migration failed:\n{mig_res.stderr}\n{mig_res.stdout}")
        sys.exit(mig_res.returncode)
    print("[OK] Alembic migrations upgraded to head successfully.")

    print(f"\nSeeding demo data into {TEST_DB_NAME}...")
    seed_res = subprocess.run(
        [sys.executable, "-m", "app.cli", "seed-demo"],
        cwd=str(backend_dir),
        env=env,
        capture_output=True,
        text=True,
    )
    if seed_res.returncode != 0:
        print(f"[ERROR] Seeding failed:\n{seed_res.stderr}\n{seed_res.stdout}")
        sys.exit(seed_res.returncode)
    print(seed_res.stdout)
    print(f"[OK] Test database '{TEST_DB_NAME}' fully migrated and seeded.")


def main():
    asyncio.run(create_database_if_not_exists())
    run_migrations_and_seed()


if __name__ == "__main__":
    main()
