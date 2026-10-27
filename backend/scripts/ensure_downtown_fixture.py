#!/usr/bin/env python3
"""
Marlow Dental — Test Fixture Helper for Test 1
Ensures Marlow Dental Downtown Studio, its doctor assignment, schedule availability,
and working hours exist in the test database for the E2E matrix toggle test.
"""

import asyncio
import os
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

env_p = Path(__file__).resolve().parent.parent / ".env"
base_url = None
if env_p.exists():
    for line in env_p.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            base_url = line.strip().split("=", 1)[1].strip('"').strip("'")
            break

db_url = os.environ.get("MARLOW_TEST_DATABASE_URL")
if not db_url and base_url:
    db_url = base_url.rsplit("/", 1)[0] + "/marlow_test"
if not db_url:
    db_url = "postgresql+asyncpg://postgres:postgres@localhost:5433/marlow_test"


async def setup_fixture():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        # 1. Ensure clinic exists
        c_res = await conn.execute(text("SELECT id FROM clinics WHERE name ILIKE '%Downtown Studio%';"))
        clinic_id = c_res.scalar()
        if not clinic_id:
            org_res = await conn.execute(text("SELECT id FROM organizations LIMIT 1;"))
            org_id = org_res.scalar()
            ins = await conn.execute(text(f"""
                INSERT INTO clinics (id, organization_id, name, address_line1, city, state, postal_code, country, phone, email, is_primary, display_order, is_active)
                VALUES (gen_random_uuid(), '{org_id}', 'Marlow Dental Downtown Studio', '456 City Center Way', 'Downtown District', 'Federal Capital', '44010', 'PK', '+92 300 7654321', 'downtown@marlowdental.com', false, 1, true)
                RETURNING id;
            """))
            clinic_id = ins.scalar()

        # 2. Ensure working hours for all 7 days
        for day in range(7):
            wh_check = await conn.execute(text(f"SELECT id FROM clinic_working_hours WHERE clinic_id = '{clinic_id}' AND day_of_week = {day};"))
            is_sunday = (day == 6)
            open_t = "'10:00'" if not is_sunday else "NULL"
            close_t = "'18:00'" if not is_sunday else "NULL"
            if not wh_check.scalar():
                await conn.execute(text(f"""
                    INSERT INTO clinic_working_hours (id, clinic_id, day_of_week, open_time, close_time, is_closed)
                    VALUES (gen_random_uuid(), '{clinic_id}', {day}, {open_t}, {close_t}, {str(is_sunday).lower()});
                """))
            else:
                await conn.execute(text(f"""
                    UPDATE clinic_working_hours 
                    SET open_time = {open_t}, close_time = {close_t}, is_closed = {str(is_sunday).lower()}
                    WHERE clinic_id = '{clinic_id}' AND day_of_week = {day};
                """))

        # 3. Ensure a doctor with availability at this clinic
        tm_res = await conn.execute(text("SELECT id FROM team_members WHERE first_name = 'Sarah' AND last_name = 'Marlow';"))
        sarah_id = tm_res.scalar()
        if not sarah_id:
            tm_any = await conn.execute(text("SELECT id FROM team_members WHERE is_active = true LIMIT 1;"))
            sarah_id = tm_any.scalar()

        if sarah_id:
            # Ensure availability on Thursday (3) and Friday (4) or all weekdays
            for dow in [0, 1, 2, 3, 4]:
                pa_check = await conn.execute(text(f"SELECT id FROM provider_availability WHERE team_member_id = '{sarah_id}' AND clinic_id = '{clinic_id}' AND day_of_week = {dow};"))
                if not pa_check.scalar():
                    await conn.execute(text(f"""
                        INSERT INTO provider_availability (id, team_member_id, clinic_id, day_of_week, start_time, end_time, break_start_time, break_end_time, is_active)
                        VALUES (gen_random_uuid(), '{sarah_id}', '{clinic_id}', {dow}, '10:00', '18:00', '13:00', '14:00', true);
                    """))

            # Ensure qualification for root-canals
            s_res = await conn.execute(text("SELECT id FROM services WHERE slug = 'root-canals';"))
            svc_id = s_res.scalar()
            if svc_id:
                sp_check = await conn.execute(text(f"SELECT id FROM service_providers WHERE team_member_id = '{sarah_id}' AND service_id = '{svc_id}';"))
                if not sp_check.scalar():
                    await conn.execute(text(f"""
                        INSERT INTO service_providers (id, team_member_id, service_id)
                        VALUES (gen_random_uuid(), '{sarah_id}', '{svc_id}');
                    """))

    await engine.dispose()
    print("[FIXTURE READY] Downtown Studio setup verified.")


async def teardown_fixture():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        pass
    await engine.dispose()
    print("[FIXTURE CLEAN] Teardown complete.")


async def setup_two_clinics_fixture():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        # 1. Ensure Capital South clinic exists in Capital District
        c_res = await conn.execute(text("SELECT id FROM clinics WHERE name ILIKE '%Capital South%';"))
        clinic_id = c_res.scalar()
        if not clinic_id:
            org_res = await conn.execute(text("SELECT id FROM organizations LIMIT 1;"))
            org_id = org_res.scalar()
            ins = await conn.execute(text(f"""
                INSERT INTO clinics (id, organization_id, name, address_line1, city, state, postal_code, country, phone, email, is_primary, display_order, is_active)
                VALUES (gen_random_uuid(), '{org_id}', 'Marlow Dental Capital South', '789 Southern Avenue', 'Capital District', 'Federal Capital', '44020', 'PK', '+92 300 7654322', 'south@marlowdental.com', false, 2, true)
                RETURNING id;
            """))
            clinic_id = ins.scalar()
        else:
            await conn.execute(text(f"UPDATE clinics SET is_active = true WHERE id = '{clinic_id}';"))

        # 2. Ensure working hours for all 7 days
        for day in range(7):
            wh_check = await conn.execute(text(f"SELECT id FROM clinic_working_hours WHERE clinic_id = '{clinic_id}' AND day_of_week = {day};"))
            is_sunday = (day == 6)
            open_t = "'10:00'" if not is_sunday else "NULL"
            close_t = "'18:00'" if not is_sunday else "NULL"
            if not wh_check.scalar():
                await conn.execute(text(f"""
                    INSERT INTO clinic_working_hours (id, clinic_id, day_of_week, open_time, close_time, is_closed)
                    VALUES (gen_random_uuid(), '{clinic_id}', {day}, {open_t}, {close_t}, {str(is_sunday).lower()});
                """))
            else:
                await conn.execute(text(f"""
                    UPDATE clinic_working_hours 
                    SET open_time = {open_t}, close_time = {close_t}, is_closed = {str(is_sunday).lower()}
                    WHERE clinic_id = '{clinic_id}' AND day_of_week = {day};
                """))

        # 3. Ensure cleanings-exams service is linked to this clinic
        s_res = await conn.execute(text("SELECT id FROM services WHERE slug = 'cleanings-exams';"))
        svc_id = s_res.scalar()
        if svc_id:
            cs_check = await conn.execute(text(f"SELECT id FROM clinic_services WHERE clinic_id = '{clinic_id}' AND service_id = '{svc_id}';"))
            if not cs_check.scalar():
                await conn.execute(text(f"""
                    INSERT INTO clinic_services (id, clinic_id, service_id, is_active)
                    VALUES (gen_random_uuid(), '{clinic_id}', '{svc_id}', true);
                """))
            else:
                await conn.execute(text(f"UPDATE clinic_services SET is_active = true WHERE clinic_id = '{clinic_id}' AND service_id = '{svc_id}';"))

        # 4. Ensure doctor availability at this clinic
        tm_res = await conn.execute(text("SELECT id FROM team_members WHERE is_active = true LIMIT 1;"))
        doc_id = tm_res.scalar()
        if doc_id:
            for dow in [0, 1, 2, 3, 4]:
                pa_check = await conn.execute(text(f"SELECT id FROM provider_availability WHERE team_member_id = '{doc_id}' AND clinic_id = '{clinic_id}' AND day_of_week = {dow};"))
                if not pa_check.scalar():
                    await conn.execute(text(f"""
                        INSERT INTO provider_availability (id, team_member_id, clinic_id, day_of_week, start_time, end_time, break_start_time, break_end_time, is_active)
                        VALUES (gen_random_uuid(), '{doc_id}', '{clinic_id}', {dow}, '10:00', '18:00', '13:00', '14:00', true);
                    """))
            if svc_id:
                sp_check = await conn.execute(text(f"SELECT id FROM service_providers WHERE team_member_id = '{doc_id}' AND service_id = '{svc_id}';"))
                if not sp_check.scalar():
                    await conn.execute(text(f"""
                        INSERT INTO service_providers (id, team_member_id, service_id)
                        VALUES (gen_random_uuid(), '{doc_id}', '{svc_id}');
                    """))

    await engine.dispose()
    print("[FIXTURE READY] Two clinics setup verified.")


async def teardown_two_clinics_fixture():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE clinics SET is_active = false WHERE name ILIKE '%Capital South%';"))
    await engine.dispose()
    print("[FIXTURE CLEAN] Two clinics teardown complete.")


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "setup"
    if action == "setup":
        asyncio.run(setup_fixture())
    elif action == "teardown":
        asyncio.run(teardown_fixture())
    elif action == "setup-two-clinics":
        asyncio.run(setup_two_clinics_fixture())
    elif action == "teardown-two-clinics":
        asyncio.run(teardown_two_clinics_fixture())


if __name__ == "__main__":
    main()
