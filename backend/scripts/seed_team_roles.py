import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def seed_roles():
    factory = get_session_factory()
    roles_to_add = [
        ("doctor", "Doctor", "Licensed Dental Practitioner"),
        ("nurse", "Nurse", "Clinical Dental Nurse / Assistant"),
        ("pharmacist", "Pharmacist", "Clinical Pharmacist"),
        ("cleaner", "Cleaner", "Facility Sanitation Specialist"),
        ("admin", "Admin", "Clinic Practice Administrator"),
        ("Doctor", "Doctor", "Licensed Dental Practitioner"),
        ("Nurse", "Nurse", "Clinical Dental Nurse / Assistant"),
        ("Pharmacist", "Pharmacist", "Clinical Pharmacist"),
        ("Cleaner", "Cleaner", "Facility Sanitation Specialist"),
        ("Admin", "Admin", "Clinic Practice Administrator"),
    ]
    async with factory() as db:
        for name, display_name, desc in roles_to_add:
            res = await db.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": name})
            if not res.scalar():
                await db.execute(text("""
                    INSERT INTO roles (id, name, display_name, description, is_active, is_system)
                    VALUES (gen_random_uuid(), :name, :display_name, :desc, true, false)
                """), {"name": name, "display_name": display_name, "desc": desc})
                print(f"Added role: {name}")
        await db.commit()
        print("Roles seeded.")

if __name__ == "__main__":
    asyncio.run(seed_roles())
