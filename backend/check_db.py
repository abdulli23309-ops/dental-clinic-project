import asyncio
from app.core.database import init_db, close_db, get_session_factory
from sqlalchemy import text

async def main():
    await init_db()
    factory = get_session_factory()
    async with factory() as s:
        r = await s.execute(text("SELECT COUNT(*) FROM users"))
        print(f"Total users: {r.scalar_one()}")
        r2 = await s.execute(text("SELECT id, email, role, is_active FROM users WHERE email = 'admin@hiradental.com'"))
        row = r2.fetchone()
        if row:
            print(f"Admin: id={row[0]}, email={row[1]}, role={row[2]}, active={row[3]}")
        else:
            print("Admin NOT FOUND")
    await close_db()

asyncio.run(main())
