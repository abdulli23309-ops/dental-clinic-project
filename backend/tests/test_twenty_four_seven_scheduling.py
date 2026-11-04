import pytest
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import select

from app.application.services.availability_service import (
    AvailabilityService,
    parse_time_to_minutes,
    format_minutes_to_time,
)
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicORM,
    ClinicWorkingHoursORM,
    OrganizationORM,
    ProviderAvailabilityORM,
    ServiceORM,
    ServiceProviderORM,
    TeamMemberClinicORM,
    TeamMemberORM,
)
from app.infrastructure.repositories.postgres_booking_settings_repo import (
    PostgresBookingSettingsRepository,
)


@pytest.mark.asyncio
async def test_parse_time_boundary_cases():
    """Verify time parser behavior on 24:00, 23:59, 00:00, AM/PM, and invalid formats."""
    # 24:00 ISO representation
    assert parse_time_to_minutes("24:00") == 1440
    assert parse_time_to_minutes("24:00:00") == 1440

    # 23:59 is strictly minute 1439 (ordinary end-of-day before midnight)
    assert parse_time_to_minutes("23:59", is_end_time=True) == 1439
    assert parse_time_to_minutes("23:59", is_end_time=False) == 1439

    # 00:00 start-of-day (0) vs end-of-day (1440)
    assert parse_time_to_minutes("00:00", is_end_time=False) == 0
    assert parse_time_to_minutes("00:00", is_end_time=True) == 1440

    # Normal times
    assert parse_time_to_minutes("09:30") == 570
    assert parse_time_to_minutes("05:30 PM") == 1050
    assert parse_time_to_minutes("12:00 AM") == 0
    assert parse_time_to_minutes("12:00 PM") == 720

    # Invalid
    assert parse_time_to_minutes("25:00") is None
    assert parse_time_to_minutes("12:65") is None


@pytest.mark.asyncio
async def test_ordinary_2359_closing_rejects_midnight_appointment(test_session):
    """
    Confirms ordinary closing at 23:59 (is_24_hours=False) is NOT treated as 24/7:
    An appointment requested at 23:30 with 30m duration ends at 24:00 (1440),
    which exceeds 23:59 (1439) and MUST be rejected.
    """
    repo = PostgresBookingSettingsRepository(test_session)
    avail_svc = AvailabilityService(booking_settings_repo=repo, session=test_session)

    org = OrganizationORM(id=uuid4(), name="Closing Org", display_name="Closing Org")
    test_session.add(org)
    await test_session.flush()

    clinic = ClinicORM(
        id=uuid4(),
        organization_id=org.id,
        name="Late Night Clinic",
        address_line1="Main Blvd",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        country="Pakistan",
        phone="+924299998888",
        is_active=True,
    )
    test_session.add(clinic)

    service = ServiceORM(
        id=uuid4(),
        title="Checkup",
        slug=f"checkup-{uuid4().hex[:6]}",
        category="General Dentistry",
        short_desc="Exam",
        full_desc="Dental Examination",
        cash_price="2000",
        duration="30m",
        buffer_minutes=0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(service)

    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=clinic.id,
        first_name="Doctor",
        last_name="Evening",
        display_name="Dr. Evening",
        professional_title="Dentist",
        role="Dentist",
        is_active=True,
    )
    test_session.add(doctor)
    await test_session.flush()

    test_session.add(TeamMemberClinicORM(team_member_id=doctor.id, clinic_id=clinic.id, is_active=True, is_primary=True))
    test_session.add(ServiceProviderORM(team_member_id=doctor.id, service_id=service.id, clinic_id=clinic.id, is_active=True))

    target_date = date.today() + timedelta(days=2)
    dow = target_date.weekday()

    # Clinic closes at 23:59 with is_24_hours=False
    test_session.add(ClinicWorkingHoursORM(
        clinic_id=clinic.id,
        day_of_week=dow,
        open_time="18:00",
        close_time="23:59",
        is_closed=False,
        is_24_hours=False,  # Explicitly False
    ))

    # Doctor shift matches clinic hours 18:00 - 23:59
    test_session.add(ProviderAvailabilityORM(
        team_member_id=doctor.id,
        clinic_id=clinic.id,
        day_of_week=dow,
        start_time="18:00",
        end_time="23:59",
        is_active=True,
        is_draft=False,
    ))
    await test_session.flush()

    slots = await avail_svc.get_available_slots(
        target_date=target_date,
        service_id=service.id,
        team_member_id=doctor.id,
        clinic_id=clinic.id,
        enforce_lead_time=False,
    )

    # 11:00 PM (23:00 - 23:30) is inside hours -> ALLOWED
    assert "11:00 PM" in slots
    # 11:30 PM (23:30 - 24:00) exceeds 23:59 closing -> REJECTED
    assert "11:30 PM" not in slots, "11:30 PM must NOT be available when clinic closes at 23:59 and is_24_hours is False"

    await test_session.rollback()


@pytest.mark.asyncio
async def test_twenty_four_seven_and_cross_midnight_workflow(test_session):
    """
    Comprehensive verification of explicit 24/7 (is_24_hours=True) and cross-midnight scheduling:
    1. Continuous 24/7 clinic operation accepts slots throughout the day up to 23:30 (ending at midnight 1440).
    2. Doctor working evening shift across midnight (20:00 - 04:00).
    3. Appointment ending exactly at boundary (23:30 + 30m = 24:00 midnight) is VALID.
    4. Appointment extending beyond boundary (04:00 AM) is REJECTED.
    5. Overnight booking from previous day prevents early morning double-booking on target date.
    """
    repo = PostgresBookingSettingsRepository(test_session)
    avail_svc = AvailabilityService(booking_settings_repo=repo, session=test_session)

    org = OrganizationORM(id=uuid4(), name="24/7 Test Org", display_name="24/7 Test Org")
    test_session.add(org)
    await test_session.flush()

    clinic = ClinicORM(
        id=uuid4(),
        organization_id=org.id,
        name="24/7 Emergency Clinic",
        address_line1="Gulberg III",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        country="Pakistan",
        phone="+924231112233",
        is_active=True,
    )
    test_session.add(clinic)

    service = ServiceORM(
        id=uuid4(),
        title="Emergency Extraction",
        slug=f"extraction-{uuid4().hex[:6]}",
        category="General Dentistry",
        short_desc="Emergency treatment",
        full_desc="Emergency tooth extraction",
        cash_price="5000",
        duration="30m",
        buffer_minutes=0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(service)

    # Doctor Dr. Nightshift
    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=clinic.id,
        first_name="Doctor",
        last_name="Nightshift",
        display_name="Dr. Nightshift",
        professional_title="Emergency Dental Surgeon",
        role="Dentist",
        is_active=True,
    )
    test_session.add(doctor)
    await test_session.flush()

    # Link doctor to clinic & service
    test_session.add(TeamMemberClinicORM(team_member_id=doctor.id, clinic_id=clinic.id, is_active=True, is_primary=True))
    test_session.add(ServiceProviderORM(team_member_id=doctor.id, service_id=service.id, clinic_id=clinic.id, is_active=True))

    target_date = date.today() + timedelta(days=2)
    dow = target_date.weekday()
    prev_dow = (dow - 1) % 7

    # Explicit 24/7 clinic working hours (is_24_hours=True)
    wh_247 = ClinicWorkingHoursORM(
        clinic_id=clinic.id,
        day_of_week=dow,
        open_time="00:00",
        close_time="23:59",
        is_closed=False,
        is_24_hours=True,  # Explicitly TRUE
    )
    test_session.add(wh_247)

    # Doctor works 20:00 to 04:00 (cross-midnight overnight shift)
    # On target_date, shift starts at 20:00 and goes into night
    test_session.add(ProviderAvailabilityORM(
        team_member_id=doctor.id,
        clinic_id=clinic.id,
        day_of_week=dow,
        start_time="20:00",
        end_time="04:00",
        is_active=True,
        is_draft=False,
    ))

    # On previous day, doctor also worked 20:00 to 04:00 (spilling morning hours 00:00 - 04:00 into target_date)
    test_session.add(ProviderAvailabilityORM(
        team_member_id=doctor.id,
        clinic_id=clinic.id,
        day_of_week=prev_dow,
        start_time="20:00",
        end_time="04:00",
        is_active=True,
        is_draft=False,
    ))
    await test_session.flush()

    # Query available slots for target_date
    slots = await avail_svc.get_available_slots(
        target_date=target_date,
        service_id=service.id,
        team_member_id=doctor.id,
        clinic_id=clinic.id,
        enforce_lead_time=False,
    )

    # Early morning slots from previous day's shift: 12:00 AM (00:00) to 03:30 AM (ended at 04:00)
    assert "12:00 AM" in slots, "00:00 slot must be available from overnight shift"
    assert "01:00 AM" in slots, "01:00 AM must be available"
    assert "03:30 AM" in slots, "03:30 AM (ending exactly at 04:00) must be available"
    assert "04:00 AM" not in slots, "04:00 AM (extends beyond 04:00 shift) must NOT be available"

    # Evening slots from target_date's shift: 08:00 PM (20:00) to 11:30 PM (23:30)
    assert "08:00 PM" in slots, "08:00 PM must be available"
    assert "11:30 PM" in slots, "11:30 PM (ending at midnight 1440) must be available in explicit 24/7 mode"

    # Daytime (10:00 AM) when doctor is off-duty
    assert "10:00 AM" not in slots, "Doctor off-duty during daytime must not be available"

    # Cross-midnight booking conflict
    yesterday = target_date - timedelta(days=1)
    booking_spill = BookingORM(
        id=uuid4(),
        confirmation_id=f"CONF-{uuid4().hex[:6].upper()}",
        clinic_id=clinic.id,
        team_member_id=doctor.id,
        service_id=str(service.id),
        patient_full_name="Overnight Patient",
        patient_phone="+923009999999",
        preferred_date=yesterday,
        preferred_time="11:30 PM",  # 23:30 + 60 mins = 00:30 AM today
        status="confirmed",
        source="online",
    )
    service.duration = "60m"
    test_session.add(booking_spill)
    await test_session.flush()

    slots_after_booking = await avail_svc.get_available_slots(
        target_date=target_date,
        service_id=service.id,
        team_member_id=doctor.id,
        clinic_id=clinic.id,
        enforce_lead_time=False,
    )

    # 12:00 AM (00:00) overlaps with yesterday's 23:30-00:30 appointment!
    assert "12:00 AM" not in slots_after_booking, "12:00 AM must be blocked by the overnight booking spillover"
    # But 01:00 AM should still be open!
    assert "01:00 AM" in slots_after_booking, "01:00 AM must be free after the 00:30 booking ends"

    await test_session.rollback()
