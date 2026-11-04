import pytest
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from app.application.services.availability_service import AvailabilityService
from app.application.services.booking_eligibility_service import BookingEligibilityService
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicORM,
    ClinicServiceORM,
    ClinicWorkingHoursORM,
    OrganizationORM,
    ProviderAvailabilityORM,
    ServiceORM,
    ServiceProviderORM,
    TeamMemberClinicORM,
    TeamMemberORM,
)
from app.infrastructure.repositories.postgres_booking_flow_settings_repo import (
    PostgresBookingFlowSettingsRepository,
)
from app.infrastructure.repositories.postgres_booking_settings_repo import (
    PostgresBookingSettingsRepository,
)
from app.infrastructure.repositories.postgres_clinic_service_repo import (
    PostgresClinicServiceRepository,
)


async def create_eligibility_test_env(test_session):
    """Sets up a complete isolated multi-branch multi-doctor test environment."""
    org = OrganizationORM(id=uuid4(), name="Eligibility Org", display_name="Eligibility Org")
    test_session.add(org)
    await test_session.flush()

    # Two branches
    branch_a = ClinicORM(
        id=uuid4(),
        organization_id=org.id,
        name="Branch A (Active)",
        address_line1="Gulberg",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        country="Pakistan",
        phone="+924211111111",
        is_active=True,
    )
    branch_b = ClinicORM(
        id=uuid4(),
        organization_id=org.id,
        name="Branch B (Active)",
        address_line1="DHA",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        country="Pakistan",
        phone="+924222222222",
        is_active=True,
    )
    branch_inactive = ClinicORM(
        id=uuid4(),
        organization_id=org.id,
        name="Branch Inactive",
        address_line1="Johar Town",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        country="Pakistan",
        phone="+924233333333",
        is_active=False,
    )
    test_session.add_all([branch_a, branch_b, branch_inactive])
    await test_session.flush()

    # Working hours for branches
    for d in range(7):
        test_session.add(ClinicWorkingHoursORM(
            clinic_id=branch_a.id, day_of_week=d, open_time="09:00", close_time="17:00", is_closed=False
        ))
        test_session.add(ClinicWorkingHoursORM(
            clinic_id=branch_b.id, day_of_week=d, open_time="09:00", close_time="17:00", is_closed=False
        ))
        test_session.add(ClinicWorkingHoursORM(
            clinic_id=branch_inactive.id, day_of_week=d, open_time="09:00", close_time="17:00", is_closed=False
        ))

    # Two services
    service_scaling = ServiceORM(
        id=uuid4(),
        title="Teeth Scaling",
        slug=f"scaling-{uuid4().hex[:6]}",
        category="Hygiene",
        short_desc="Cleaning",
        full_desc="Full mouth ultrasonic scaling",
        cash_price="3000",
        duration="30m",
        buffer_minutes=0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    service_implant = ServiceORM(
        id=uuid4(),
        title="Dental Implant",
        slug=f"implant-{uuid4().hex[:6]}",
        category="Surgery",
        short_desc="Implant",
        full_desc="Titanium implant placement",
        cash_price="50000",
        duration="60m",
        buffer_minutes=15,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add_all([service_scaling, service_implant])
    await test_session.flush()

    # Branch A offers Scaling and Implant
    test_session.add(ClinicServiceORM(clinic_id=branch_a.id, service_id=service_scaling.id, is_active=True))
    test_session.add(ClinicServiceORM(clinic_id=branch_a.id, service_id=service_implant.id, is_active=True))

    # Branch B offers ONLY Scaling (Implant is NOT offered at Branch B)
    test_session.add(ClinicServiceORM(clinic_id=branch_b.id, service_id=service_scaling.id, is_active=True))

    # Doctors
    # Doctor Alice: Assigned to Branch A only, authorized for Scaling
    doc_alice = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=branch_a.id,
        first_name="Alice",
        last_name="Doctor",
        display_name="Dr. Alice",
        professional_title="Dentist",
        role="Dentist",
        is_active=True,
    )
    # Doctor Bob: Multi-branch (Branch A and B), authorized for Implant at Branch A
    doc_bob = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=branch_a.id,
        first_name="Bob",
        last_name="Doctor",
        display_name="Dr. Bob",
        professional_title="Oral Surgeon",
        role="Dentist",
        is_active=True,
    )
    # Doctor Inactive
    doc_inactive = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=branch_a.id,
        first_name="Charlie",
        last_name="Inactive",
        display_name="Dr. Charlie",
        professional_title="Dentist",
        role="Dentist",
        is_active=False,
    )
    test_session.add_all([doc_alice, doc_bob, doc_inactive])
    await test_session.flush()

    # Link branch assignments
    test_session.add(TeamMemberClinicORM(team_member_id=doc_alice.id, clinic_id=branch_a.id, is_active=True, is_primary=True))
    test_session.add(TeamMemberClinicORM(team_member_id=doc_bob.id, clinic_id=branch_a.id, is_active=True, is_primary=True))
    test_session.add(TeamMemberClinicORM(team_member_id=doc_bob.id, clinic_id=branch_b.id, is_active=True, is_primary=False))

    # Doctor Service Authorizations
    test_session.add(ServiceProviderORM(team_member_id=doc_alice.id, service_id=service_scaling.id, clinic_id=branch_a.id, is_active=True))
    test_session.add(ServiceProviderORM(team_member_id=doc_bob.id, service_id=service_implant.id, clinic_id=branch_a.id, is_active=True))

    # Working Shifts: Dr. Alice works Mon-Sun 09:00 - 17:00 at Branch A
    for d in range(7):
        test_session.add(ProviderAvailabilityORM(
            team_member_id=doc_alice.id, clinic_id=branch_a.id, day_of_week=d, start_time="09:00", end_time="17:00", is_active=True
        ))
        test_session.add(ProviderAvailabilityORM(
            team_member_id=doc_bob.id, clinic_id=branch_a.id, day_of_week=d, start_time="09:00", end_time="17:00", is_active=True
        ))

    await test_session.flush()

    # Construct eligibility service
    settings_repo = PostgresBookingSettingsRepository(test_session)
    clinic_svc_repo = PostgresClinicServiceRepository(test_session)
    flow_repo = PostgresBookingFlowSettingsRepository(test_session)
    avail_svc = AvailabilityService(booking_settings_repo=settings_repo, session=test_session)

    eligibility_svc = BookingEligibilityService(
        session=test_session,
        clinic_service_repo=clinic_svc_repo,
        booking_flow_settings_repo=flow_repo,
        booking_settings_repo=settings_repo,
        availability_service=avail_svc,
    )

    return {
        "org": org,
        "branch_a": branch_a,
        "branch_b": branch_b,
        "branch_inactive": branch_inactive,
        "service_scaling": service_scaling,
        "service_implant": service_implant,
        "doc_alice": doc_alice,
        "doc_bob": doc_bob,
        "doc_inactive": doc_inactive,
        "eligibility_svc": eligibility_svc,
        "avail_svc": avail_svc,
        "db": test_session,
    }


@pytest.mark.asyncio
async def test_doctor_assigned_to_branch_a_cannot_appear_for_branch_b(test_session):
    """Doctor Alice is assigned to Branch A only. She must NOT be eligible at Branch B."""
    env = await create_eligibility_test_env(test_session)
    svc = env["eligibility_svc"]

    res = await svc.check_service_bookability(service_id=env["service_scaling"].id, clinic_id=env["branch_b"].id)
    # Alice must NOT be in eligible doctors at Branch B
    assert env["doc_alice"].id not in res.eligible_doctors


@pytest.mark.asyncio
async def test_doctor_not_authorized_for_service_cannot_appear_for_service(test_session):
    """Doctor Alice is only authorized for Scaling. She must NOT be eligible for Implant."""
    env = await create_eligibility_test_env(test_session)
    svc = env["eligibility_svc"]

    res = await svc.check_service_bookability(service_id=env["service_implant"].id, clinic_id=env["branch_a"].id)
    assert env["doc_alice"].id not in res.eligible_doctors
    assert env["doc_bob"].id in res.eligible_doctors


@pytest.mark.asyncio
async def test_service_disabled_at_branch_cannot_be_booked_there(test_session):
    """Dental Implant is not offered at Branch B. Bookability check must fail."""
    env = await create_eligibility_test_env(test_session)
    svc = env["eligibility_svc"]

    res = await svc.check_service_bookability(service_id=env["service_implant"].id, clinic_id=env["branch_b"].id)
    assert res.is_eligible is False
    assert "NOT_OFFERED_AT_CLINIC" in res.reasons or "NO_ACTIVE_CLINIC" in res.reasons


@pytest.mark.asyncio
async def test_inactive_branch_cannot_accept_public_bookings(test_session):
    """Branch Inactive cannot accept bookings for any service."""
    env = await create_eligibility_test_env(test_session)
    svc = env["eligibility_svc"]

    res = await svc.check_service_bookability(service_id=env["service_scaling"].id, clinic_id=env["branch_inactive"].id)
    assert res.is_eligible is False
    assert "NO_ACTIVE_CLINIC" in res.reasons


@pytest.mark.asyncio
async def test_inactive_doctor_cannot_be_booked(test_session):
    """Doctor Charlie is marked is_active=False. He must never appear as eligible."""
    env = await create_eligibility_test_env(test_session)
    svc = env["eligibility_svc"]

    res = await svc.check_service_bookability(service_id=env["service_scaling"].id, clinic_id=env["branch_a"].id)
    assert env["doc_inactive"].id not in res.eligible_doctors


@pytest.mark.asyncio
async def test_conflicting_appointment_prevents_another_booking(test_session):
    """A confirmed booking at 10:00 blocks that slot from being available."""
    env = await create_eligibility_test_env(test_session)
    avail = env["avail_svc"]
    db = env["db"]
    target_date = date.today() + timedelta(days=2)

    # 1. Verify 10:00 is initially available
    slots_before = await avail.get_available_slots(
        target_date=target_date,
        service_id=env["service_scaling"].id,
        team_member_id=env["doc_alice"].id,
        clinic_id=env["branch_a"].id,
        enforce_lead_time=False,
    )
    assert "10:00 AM" in slots_before

    # 2. Add conflicting booking
    conflict = BookingORM(
        id=uuid4(),
        confirmation_id=f"CONF-{uuid4().hex[:6].upper()}",
        clinic_id=env["branch_a"].id,
        team_member_id=env["doc_alice"].id,
        service_id=str(env["service_scaling"].id),
        patient_full_name="Conflict Patient",
        patient_phone="+923001234567",
        preferred_date=target_date,
        preferred_time="10:00 AM",
        status="confirmed",
        source="online",
    )
    db.add(conflict)
    await db.flush()

    # 3. Verify 10:00 is now blocked
    slots_after = await avail.get_available_slots(
        target_date=target_date,
        service_id=env["service_scaling"].id,
        team_member_id=env["doc_alice"].id,
        clinic_id=env["branch_a"].id,
        enforce_lead_time=False,
    )
    assert "10:00 AM" not in slots_after, "10:00 AM must be blocked by the conflicting confirmed booking"


@pytest.mark.asyncio
async def test_doctor_without_working_shift_cannot_be_booked(test_session):
    """
    Doctor David is assigned to Branch A and authorized for Scaling,
    but has NO working shifts on Saturday (dow=5). Slots on Saturday must be empty.
    """
    env = await create_eligibility_test_env(test_session)
    avail = env["avail_svc"]
    db = env["db"]

    doc_david = TeamMemberORM(
        id=uuid4(),
        organization_id=env["org"].id,
        clinic_id=env["branch_a"].id,
        first_name="David",
        last_name="Shifttest",
        display_name="Dr. David",
        professional_title="Dentist",
        role="Dentist",
        is_active=True,
    )
    db.add(doc_david)
    await db.flush()

    db.add(TeamMemberClinicORM(team_member_id=doc_david.id, clinic_id=env["branch_a"].id, is_active=True, is_primary=True))
    db.add(ServiceProviderORM(team_member_id=doc_david.id, service_id=env["service_scaling"].id, clinic_id=env["branch_a"].id, is_active=True))

    # Doctor David only works on Monday (dow=0), NOT on Sunday (dow=6)
    db.add(ProviderAvailabilityORM(
        team_member_id=doc_david.id, clinic_id=env["branch_a"].id, day_of_week=0, start_time="09:00", end_time="17:00", is_active=True
    ))
    await db.flush()

    # Find next Sunday
    today = date.today()
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:
        days_until_sunday = 7
    target_sunday = today + timedelta(days=days_until_sunday)

    slots_sunday = await avail.get_available_slots(
        target_date=target_sunday,
        service_id=env["service_scaling"].id,
        team_member_id=doc_david.id,
        clinic_id=env["branch_a"].id,
        enforce_lead_time=False,
    )
    assert len(slots_sunday) == 0, f"Doctor with no shift on Sunday must have 0 available slots, got: {slots_sunday}"


@pytest.mark.asyncio
async def test_empty_doctor_service_assignments_does_not_silently_authorize_doctor(test_session):
    """
    Doctor Emily is assigned to Branch A, but has zero doctor-service authorizations.
    She must NOT be silently authorized for any procedure.
    """
    env = await create_eligibility_test_env(test_session)
    svc = env["eligibility_svc"]
    db = env["db"]

    doc_emily = TeamMemberORM(
        id=uuid4(),
        organization_id=env["org"].id,
        clinic_id=env["branch_a"].id,
        first_name="Emily",
        last_name="Unassigned",
        display_name="Dr. Emily",
        professional_title="Dentist",
        role="Dentist",
        is_active=True,
    )
    db.add(doc_emily)
    await db.flush()

    db.add(TeamMemberClinicORM(team_member_id=doc_emily.id, clinic_id=env["branch_a"].id, is_active=True, is_primary=True))
    await db.flush()

    res = await svc.check_service_bookability(service_id=env["service_scaling"].id, clinic_id=env["branch_a"].id)
    assert doc_emily.id not in res.eligible_doctors, "Doctor with no service authorizations must not be authorized"


@pytest.mark.asyncio
async def test_multi_branch_doctor_only_eligible_at_assigned_branch_for_assigned_services(test_session):
    """
    Doctor Bob is assigned to Branch A and Branch B.
    At Branch A, he is authorized for Implant.
    At Branch B, he is NOT authorized for Implant.
    He must be eligible for Implant at Branch A, but NOT at Branch B.
    """
    env = await create_eligibility_test_env(test_session)
    svc = env["eligibility_svc"]

    res_a = await svc.check_service_bookability(service_id=env["service_implant"].id, clinic_id=env["branch_a"].id)
    assert env["doc_bob"].id in res_a.eligible_doctors, "Bob must be eligible for Implant at Branch A"

    res_b = await svc.check_service_bookability(service_id=env["service_implant"].id, clinic_id=env["branch_b"].id)
    assert env["doc_bob"].id not in res_b.eligible_doctors, "Bob must NOT be eligible for Implant at Branch B"
