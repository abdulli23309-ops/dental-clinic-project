import asyncio
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

load_dotenv(BACKEND_DIR / ".env")
base_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/marlow_test")

# Database URL for administrative postgres db
postgres_url = base_url.rsplit("/", 1)[0] + "/postgres"
test_db_name = "hira_verify_seed"
test_db_url = base_url.rsplit("/", 1)[0] + "/" + test_db_name

async def setup_test_db():
    print(f"Connecting to {postgres_url} to ensure clean {test_db_name} exists...")
    engine = create_async_engine(postgres_url, isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        # Terminate any existing connections to test_db_name
        await conn.execute(text(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{test_db_name}'
              AND pid <> pg_backend_pid();
        """))
        # Drop and create
        await conn.execute(text(f"DROP DATABASE IF EXISTS {test_db_name};"))
        await conn.execute(text(f"CREATE DATABASE {test_db_name};"))
    await engine.dispose()
    print(f"[OK] Created clean database '{test_db_name}'.")

def run_alembic():
    print(f"Running Alembic upgrade head against '{test_db_name}'...")
    env = os.environ.copy()
    env["DATABASE_URL"] = test_db_url
    res = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        print("Alembic failed:")
        print(res.stderr)
        raise RuntimeError("Alembic upgrade head failed")
    print("[OK] Alembic migrations upgraded to head successfully.")

async def count_tables():
    engine = create_async_engine(test_db_url)
    tables = [
        "organizations", "locations", "clinics", "roles", "team_members",
        "team_member_clinics", "services", "clinic_services", "service_providers",
        "provider_availability", "clinic_working_hours", "clinic_booking_settings",
        "users", "gallery_images", "reviews", "patients", "bookings",
        "booking_flow_settings", "site_sections"
    ]
    counts = {}
    async with engine.connect() as conn:
        for t in tables:
            try:
                r = await conn.execute(text(f"SELECT count(*) FROM {t}"))
                counts[t] = r.scalar()
            except Exception as e:
                counts[t] = f"ERROR: {e}"
    await engine.dispose()
    return counts

async def main():
    await setup_test_db()
    run_alembic()

    # Import seed
    from scripts.seed_demo_data import seed_database
    
    print("\n--- SEED RUN 1 ---")
    await seed_database(database_name=test_db_name, dry_run=False)
    counts1 = await count_tables()
    print("Table counts after Run 1:")
    for t, c in counts1.items():
        print(f"  {t}: {c}")

    print("\n--- SEED RUN 2 (Idempotency Check) ---")
    await seed_database(database_name=test_db_name, dry_run=False)
    counts2 = await count_tables()
    print("Table counts after Run 2:")
    for t, c in counts2.items():
        print(f"  {t}: {c}")

    # Verify counts match
    diffs = []
    for t in counts1:
        if counts1[t] != counts2[t]:
            diffs.append(f"{t}: Run 1 had {counts1[t]}, Run 2 had {counts2[t]}")

    if diffs:
        print("\n[FAIL] Table count diffs detected:")
        for d in diffs:
            print(f"  - {d}")
        sys.exit(1)
    else:
        print("\n[PERFECT PASS] Seed is 100% idempotent! All table counts are identical between Run 1 and Run 2.")

    # Image files check
    uploads_dir = BACKEND_DIR / "uploads"
    upload_count = len(list(uploads_dir.glob("*")))
    print(f"\nMedia verification: {upload_count} files present in uploads/.")
    if upload_count < 30:
        print("[FAIL] Less than 30 media files found!")
        sys.exit(1)
    print("[PERFECT PASS] Media assets verified on disk.")

if __name__ == "__main__":
    asyncio.run(main())
