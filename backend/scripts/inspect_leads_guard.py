import asyncio
from sqlalchemy import text
from app.core.database import get_session_factory

async def run():
    session_factory = get_session_factory()
    async with session_factory() as session:
        print("=== PG_INDEXES ===")
        r1 = await session.execute(text("SELECT indexname, indexdef FROM pg_indexes WHERE tablename='leads';"))
        for row in r1.all():
            print(f"{row[0]} | {row[1]}")
        print("\n=== PG_CONSTRAINT ===")
        r2 = await session.execute(text("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='leads'::regclass;"))
        for row in r2.all():
            print(f"{row[0]} | {row[1]}")
        print("\n=== DISTINCT STATUS ===")
        r3 = await session.execute(text("SELECT DISTINCT status FROM leads;"))
        for row in r3.all():
            print(f"{row[0]}")

if __name__ == "__main__":
    asyncio.run(run())
