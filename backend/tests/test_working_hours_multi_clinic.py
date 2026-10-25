from uuid import uuid4
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.orm_models import (
    ClinicORM,
    ClinicWorkingHoursORM,
    OrganizationORM,
)


@pytest.mark.asyncio
async def test_public_working_hours_multi_clinic_two_blocks(
    client_with_db: AsyncClient, test_session: AsyncSession
):
    # 1. Setup Organization
    org_id = uuid4()
    org = OrganizationORM(
        id=org_id,
        name="Marlow Dental Group",
        display_name="Marlow Dental",
        contact_email="group@marlow.test",
        contact_phone="+1234567890",
    )
    test_session.add(org)

    # 2. Setup Two Clinics: Clinic A (Primary), Clinic B (Secondary)
    clinic_a_id = uuid4()
    clinic_a = ClinicORM(
        id=clinic_a_id,
        organization_id=org_id,
        name="Marlow Dental Main Clinic",
        address_line1="100 Main St",
        city="Marlow",
        state="IL",
        postal_code="60001",
        country="USA",
        is_primary=True,
        is_active=True,
        display_order=0,
    )

    clinic_b_id = uuid4()
    clinic_b = ClinicORM(
        id=clinic_b_id,
        organization_id=org_id,
        name="Marlow Dental Downtown Studio",
        address_line1="200 Downtown Ave",
        city="Marlow",
        state="IL",
        postal_code="60002",
        country="USA",
        is_primary=False,
        is_active=True,
        display_order=1,
    )
    test_session.add_all([clinic_a, clinic_b])

    # 3. Setup Two Blocks per Day for each of the 7 days (14 rows per clinic)
    # Plus an unassigned (clinic_id IS NULL) row to verify it is excluded
    working_hours_rows = []

    # Clinic A: morning 08:00-12:00, afternoon 13:00-17:00 (days 0-5), Sunday (day 6) closed
    for dow in range(7):
        if dow == 6:
            working_hours_rows.append(
                ClinicWorkingHoursORM(
                    id=uuid4(),
                    clinic_id=clinic_a_id,
                    day_of_week=dow,
                    open_time=None,
                    close_time=None,
                    is_closed=True,
                )
            )
        else:
            working_hours_rows.append(
                ClinicWorkingHoursORM(
                    id=uuid4(),
                    clinic_id=clinic_a_id,
                    day_of_week=dow,
                    open_time="08:00",
                    close_time="12:00",
                    is_closed=False,
                )
            )
            working_hours_rows.append(
                ClinicWorkingHoursORM(
                    id=uuid4(),
                    clinic_id=clinic_a_id,
                    day_of_week=dow,
                    open_time="13:00",
                    close_time="17:00",
                    is_closed=False,
                )
            )

    # Clinic B: morning 10:00-14:00, afternoon 15:00-19:00 (days 0-5), Sunday (day 6) closed
    for dow in range(7):
        if dow == 6:
            working_hours_rows.append(
                ClinicWorkingHoursORM(
                    id=uuid4(),
                    clinic_id=clinic_b_id,
                    day_of_week=dow,
                    open_time=None,
                    close_time=None,
                    is_closed=True,
                )
            )
        else:
            working_hours_rows.append(
                ClinicWorkingHoursORM(
                    id=uuid4(),
                    clinic_id=clinic_b_id,
                    day_of_week=dow,
                    open_time="10:00",
                    close_time="14:00",
                    is_closed=False,
                )
            )
            working_hours_rows.append(
                ClinicWorkingHoursORM(
                    id=uuid4(),
                    clinic_id=clinic_b_id,
                    day_of_week=dow,
                    open_time="15:00",
                    close_time="19:00",
                    is_closed=False,
                )
            )

    # Orphaned legacy seed row with clinic_id IS NULL
    working_hours_rows.append(
        ClinicWorkingHoursORM(
            id=uuid4(),
            clinic_id=None,
            day_of_week=0,
            open_time="07:00",
            close_time="20:00",
            is_closed=False,
        )
    )

    test_session.add_all(working_hours_rows)
    await test_session.commit()

    # 4. Verify GET /api/v1/public/working-hours without clinic_id returns 7 rows for Clinic A (Primary)
    res_default = await client_with_db.get("/api/v1/public/working-hours")
    assert res_default.status_code == 200
    data_default = res_default.json()
    assert len(data_default) == 7
    assert all(row["clinicId"] == str(clinic_a_id) for row in data_default)
    # Check days 0-6 in order
    for idx, row in enumerate(data_default):
        assert row["dayOfWeek"] == idx
    # Day 0 has two merged blocks
    assert "08:00 - 12:00, 13:00 - 17:00" in data_default[0]["openTime"]
    assert not any(row["openTime"] == "07:00 - 20:00" for row in data_default)

    # 5. Verify GET /api/v1/public/working-hours?clinic_id=... returns 7 rows for Clinic B
    res_clinic_b = await client_with_db.get(f"/api/v1/public/working-hours?clinic_id={clinic_b_id}")
    assert res_clinic_b.status_code == 200
    data_clinic_b = res_clinic_b.json()
    assert len(data_clinic_b) == 7
    assert all(row["clinicId"] == str(clinic_b_id) for row in data_clinic_b)
    for idx, row in enumerate(data_clinic_b):
        assert row["dayOfWeek"] == idx
    assert "10:00 - 14:00, 15:00 - 19:00" in data_clinic_b[0]["openTime"]

    # 6. Verify GET for Clinic A explicitly
    res_clinic_a = await client_with_db.get(f"/api/v1/public/working-hours?clinic_id={clinic_a_id}")
    assert res_clinic_a.status_code == 200
    data_clinic_a = res_clinic_a.json()
    assert len(data_clinic_a) == 7
    assert all(row["clinicId"] == str(clinic_a_id) for row in data_clinic_a)
