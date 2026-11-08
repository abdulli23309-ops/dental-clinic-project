import json
import pytest
import pytest_asyncio
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo
from sqlalchemy import select

from app.core.security import hash_password
from app.domain.models.user import User, UserRole
from app.infrastructure.database.orm_models import (
    AppointmentCategoryORM,
    BookingORM,
    CancellationRequestORM,
    ClinicBookingSettingsORM,
    ClinicORM,
    ClinicServiceORM,
    ClinicWorkingHoursORM,
    DoctorScheduleOverrideORM,
    OrganizationORM,
    PatientORM,
    ProviderAvailabilityORM,
    RescheduleRequestORM,
    ServiceORM,
    ServiceProviderORM,
    TaskORM,
    TeamMemberClinicORM,
    TeamMemberORM,
)
from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository
from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository


async def get_or_create_test_org(session) -> OrganizationORM:
    org_res = await session.execute(select(OrganizationORM).limit(1))
    org = org_res.scalars().first()
    if not org:
        org = OrganizationORM(
            id=uuid4(),
            name="Marlow Dental Practice",
            display_name="Marlow Dental Practice",
            currency_code="PKR",
            is_active=True,
        )
        session.add(org)
        await session.commit()
    return org


def make_test_clinic(org_id: UUID, name: str = "Test Clinic", clinic_id: Optional[UUID] = None) -> ClinicORM:
    return ClinicORM(
        id=clinic_id or uuid4(),
        organization_id=org_id,
        name=name,
        address_line1="45 Main Dental Boulevard",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        country="Pakistan",
        is_active=True,
    )


@pytest_asyncio.fixture
async def platform_owner_auth(test_session, client_with_db):
    user_repo = PostgresUserRepository(test_session)
    owner = User(
        email="platform.owner@marlowdental.com",
        hashed_password=hash_password("OwnerPassword123!"),
        full_name="Platform Owner",
        role=UserRole.PLATFORM_OWNER,
        is_active=True,
    )
    await user_repo.save(owner)
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "platform.owner@marlowdental.com", "password": "OwnerPassword123!"},
    )
    assert resp.status_code == 200
    token = resp.json()["accessToken"]
    return {"headers": {"Authorization": f"Bearer {token}"}, "user": owner}


@pytest.mark.asyncio
async def test_platform_owner_vs_admin_clinic_governance(
    client_with_db, admin_auth, platform_owner_auth, test_session
):
    """
    Governance Rule:
    Platform Owner exclusively creates and deletes clinics/branches.
    Admin cannot create or delete clinics/branches (403 Forbidden).
    """
    client = client_with_db
    admin_headers = admin_auth["headers"]
    owner_headers = platform_owner_auth["headers"]
    org = await get_or_create_test_org(test_session)

    payload = {
        "name": "Unauthorized Clinic Branch",
        "addressLine1": "Phase 6 DHA",
        "city": "Lahore",
        "state": "Punjab",
        "postalCode": "54000",
        "country": "Pakistan",
        "isActive": True,
    }

    # 1. Admin attempts to create clinic -> 403 Forbidden
    admin_create_resp = await client.post("/api/v1/admin/locations", json=payload, headers=admin_headers)
    assert admin_create_resp.status_code == 403

    # 2. Platform Owner creates clinic -> 200/201 Success
    owner_create_resp = await client.post("/api/v1/admin/locations", json=payload, headers=owner_headers)
    assert owner_create_resp.status_code in [200, 201]
    clinic_data = owner_create_resp.json()
    new_clinic_id = clinic_data["id"]

    # 3. Admin attempts to delete clinic -> 403 Forbidden
    admin_del_resp = await client.delete(f"/api/v1/admin/locations/{new_clinic_id}", headers=admin_headers)
    assert admin_del_resp.status_code == 403

    # 4. Platform Owner deletes clinic -> 200 or 204
    owner_del_resp = await client.delete(f"/api/v1/admin/locations/{new_clinic_id}", headers=owner_headers)
    assert owner_del_resp.status_code in [200, 204]


@pytest.mark.asyncio
async def test_independent_clinic_hours_multi_period_and_24_7(
    client_with_db, admin_auth, test_session
):
    """
    Clinic working hours support:
    - Explicit 24/7 configuration (is_24_hours = True)
    - Multi-period split opening hours on same day
    """
    client = client_with_db
    admin_headers = admin_auth["headers"]
    org = await get_or_create_test_org(test_session)

    clinic = make_test_clinic(org.id, name="24-7 Emergency Center")
    test_session.add(clinic)
    await test_session.commit()

    tz = ZoneInfo("Asia/Karachi")
    target_date = datetime.now(tz).date() + timedelta(days=2)
    dow = target_date.weekday()

    # Get existing working hours list for the clinic
    get_wh = await client.get(
        f"/api/v1/admin/booking/working-hours?clinicId={clinic.id}",
        headers=admin_headers,
    )
    assert get_wh.status_code == 200
    wh_list = get_wh.json()
    target_wh = next(w for w in wh_list if w["dayOfWeek"] == dow)

    # 1. Configure Day as 24/7
    payload_247 = [
        {
            "id": target_wh["id"],
            "clinicId": str(clinic.id),
            "dayOfWeek": dow,
            "isClosed": False,
            "is24Hours": True,
            "openTime": "00:00",
            "closeTime": "23:59",
        }
    ]
    wh_resp = await client.put(
        "/api/v1/admin/booking/working-hours",
        json=payload_247,
        headers=admin_headers,
    )
    assert wh_resp.status_code == 200

    # Availability endpoint returns early morning slots (e.g., 01:00 AM, 02:00 AM)
    avail_resp = await client.get(
        f"/api/v1/public/availability?date={target_date.isoformat()}&clinicId={clinic.id}"
    )
    assert avail_resp.status_code == 200
    slots_247 = avail_resp.json()["slots"]
    assert "01:00 AM" in slots_247
    assert "03:00 AM" in slots_247

    # 2. Configure Day with Multi-Period Split (09:00 - 13:00 and 17:00 - 21:00)
    split_periods = [
        {"open_time": "09:00", "close_time": "13:00"},
        {"open_time": "17:00", "close_time": "21:00"},
    ]
    payload_split = [
        {
            "id": target_wh["id"],
            "clinicId": str(clinic.id),
            "dayOfWeek": dow,
            "isClosed": False,
            "is24Hours": False,
            "periodsJson": json.dumps(split_periods),
            "openTime": "09:00",
            "closeTime": "21:00",
        }
    ]
    wh_resp2 = await client.put(
        "/api/v1/admin/booking/working-hours",
        json=payload_split,
        headers=admin_headers,
    )
    assert wh_resp2.status_code == 200

    avail_resp2 = await client.get(
        f"/api/v1/public/availability?date={target_date.isoformat()}&clinicId={clinic.id}"
    )
    assert avail_resp2.status_code == 200
    slots_split = avail_resp2.json()["slots"]
    assert "10:00 AM" in slots_split
    assert "06:00 PM" in slots_split
    # Afternoon closure period (13:00 to 17:00) must NOT have slots
    assert "02:00 PM" not in slots_split
    assert "03:00 PM" not in slots_split


@pytest.mark.asyncio
async def test_doctor_multi_branch_and_service_duration_overrides(
    client_with_db, admin_auth, test_session
):
    """
    Doctors can be assigned to multiple branches.
    Doctor-service assignments support custom duration and buffer overrides per branch.
    """
    client = client_with_db
    admin_headers = admin_auth["headers"]
    org = await get_or_create_test_org(test_session)

    clinic_a = make_test_clinic(org.id, name="Branch Alpha")
    clinic_b = make_test_clinic(org.id, name="Branch Beta")
    clinic_c = make_test_clinic(org.id, name="Branch Gamma")
    test_session.add_all([clinic_a, clinic_b, clinic_c])

    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        first_name="Hira",
        last_name="Tariq",
        display_name="Dr. Hira Tariq",
        role="Doctor",
        professional_title="Prosthodontist",
        is_active=True,
    )
    test_session.add(doctor)

    service = ServiceORM(
        id=uuid4(),
        slug="porcelain-crown",
        title="Porcelain Crown",
        short_desc="Porcelain Crown Restorative Treatment",
        category="Restorative",
        cash_price="Rs. 15,000",
        duration="30m",
        buffer_minutes=0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(service)
    await test_session.commit()

    # Link service to clinics
    test_session.add_all([
        ClinicServiceORM(clinic_id=clinic_a.id, service_id=service.id, is_active=True),
        ClinicServiceORM(clinic_id=clinic_b.id, service_id=service.id, is_active=True),
        ClinicServiceORM(clinic_id=clinic_c.id, service_id=service.id, is_active=True),
    ])
    await test_session.commit()

    # 1. Assign Doctor to Branch Alpha and Branch Beta only
    branch_payload = {
        "teamMemberId": str(doctor.id),
        "clinicIds": [str(clinic_a.id), str(clinic_b.id)],
    }
    assign_branch_resp = await client.post(
        "/api/v1/admin/booking/doctor-branches",
        json=branch_payload,
        headers=admin_headers,
    )
    assert assign_branch_resp.status_code == 200
    assigned_clinics = assign_branch_resp.json()
    assert len(assigned_clinics) == 2

    # Query GET doctor-branches
    get_branches_resp = await client.get(
        f"/api/v1/admin/booking/doctor-branches?teamMemberId={doctor.id}",
        headers=admin_headers,
    )
    assert get_branches_resp.status_code == 200
    assert len(get_branches_resp.json()) == 2

    # 2. Assign Doctor to Service with Custom Duration (45 mins) and Buffer (15 mins) at Branch Alpha
    svc_payload = {
        "teamMemberId": str(doctor.id),
        "clinicId": str(clinic_a.id),
        "serviceId": str(service.id),
        "customDurationMinutes": 45,
        "bufferMinutes": 15,
        "isActive": True,
    }
    assign_svc_resp = await client.post(
        "/api/v1/admin/booking/doctor-services",
        json=svc_payload,
        headers=admin_headers,
    )
    assert assign_svc_resp.status_code == 200
    svc_assignment = assign_svc_resp.json()
    assert svc_assignment["customDurationMinutes"] == 45
    assert svc_assignment["bufferMinutes"] == 15

    # 3. Doctor is NOT eligible at Branch Gamma
    avail_gamma = await client.get(
        f"/api/v1/public/availability?clinicId={clinic_c.id}&teamMemberId={doctor.id}&serviceId={service.id}"
    )
    assert avail_gamma.status_code == 200
    assert avail_gamma.json()["slots"] == []


@pytest.mark.asyncio
async def test_date_specific_overrides_draft_vs_published_and_conflict_warnings(
    client_with_db, admin_auth, test_session
):
    """
    Date-specific overrides:
    - Draft override does NOT affect public availability.
    - Schedule conflicts endpoint identifies affected appointments.
    - Publishing schedule updates public availability.
    """
    client = client_with_db
    admin_headers = admin_auth["headers"]
    org = await get_or_create_test_org(test_session)

    clinic = make_test_clinic(org.id, name="Gulberg Branch")
    test_session.add(clinic)

    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        first_name="Zahid",
        last_name="Khan",
        display_name="Dr. Zahid Khan",
        role="Doctor",
        professional_title="Dentist",
        is_active=True,
    )
    test_session.add(doctor)

    tz = ZoneInfo("Asia/Karachi")
    target_date = datetime.now(tz).date() + timedelta(days=3)
    dow = target_date.weekday()

    # Clinic hours
    wh = ClinicWorkingHoursORM(
        id=uuid4(),
        clinic_id=clinic.id,
        day_of_week=dow,
        open_time="09:00",
        close_time="17:00",
        is_closed=False,
    )
    test_session.add(wh)

    # Doctor shift
    shift = ProviderAvailabilityORM(
        id=uuid4(),
        team_member_id=doctor.id,
        clinic_id=clinic.id,
        day_of_week=dow,
        start_time="09:00",
        end_time="17:00",
        is_active=True,
        is_draft=False,
    )
    test_session.add(shift)

    # Pre-existing booking on that date
    booking = BookingORM(
        id=uuid4(),
        confirmation_id="MD-CONFLICT-01",
        clinic_id=clinic.id,
        team_member_id=doctor.id,
        preferred_date=target_date,
        preferred_time="10:00 AM",
        patient_full_name="Existing Patient",
        patient_phone="03001234567",
        phone_normalized="03001234567",
        status="confirmed",
    )
    test_session.add(booking)
    await test_session.commit()

    # 1. Create a DRAFT date-specific override marking the date as 'unavailable'
    override_payload = {
        "teamMemberId": str(doctor.id),
        "clinicId": str(clinic.id),
        "overrideDate": target_date.isoformat(),
        "overrideType": "unavailable",
        "isDraft": True,
        "reason": "Attending dental conference in Karachi",
    }
    create_ovr_resp = await client.post(
        "/api/v1/admin/booking/doctor-overrides",
        json=override_payload,
        headers=admin_headers,
    )
    assert create_ovr_resp.status_code == 200
    override_id = create_ovr_resp.json()["id"]

    # 2. Public availability MUST still show slots because override is in DRAFT status
    avail_draft = await client.get(
        f"/api/v1/public/availability?date={target_date.isoformat()}&clinicId={clinic.id}&teamMemberId={doctor.id}"
    )
    assert avail_draft.status_code == 200
    assert len(avail_draft.json()["slots"]) > 0

    # 3. Check conflict detection before publishing
    conflicts_resp = await client.get(
        f"/api/v1/admin/booking/schedule-conflicts?teamMemberId={doctor.id}",
        headers=admin_headers,
    )
    assert conflicts_resp.status_code == 200
    conflict_data = conflicts_resp.json()
    assert len(conflict_data) >= 1
    assert any(c["confirmationId"] == "MD-CONFLICT-01" for c in conflict_data)

    # 4. Publish the schedule override
    pub_resp = await client.post(
        "/api/v1/admin/booking/publish-schedule",
        json={"teamMemberId": str(doctor.id)},
        headers=admin_headers,
    )
    assert pub_resp.status_code == 200
    assert pub_resp.json()["publishedOverridesCount"] >= 1

    # 5. Public availability now reflects the published override (0 slots)
    avail_pub = await client.get(
        f"/api/v1/public/availability?date={target_date.isoformat()}&clinicId={clinic.id}&teamMemberId={doctor.id}"
    )
    assert avail_pub.status_code == 200
    assert avail_pub.json()["slots"] == []


@pytest.mark.asyncio
async def test_inter_branch_travel_buffer(client_with_db, test_session):
    """
    Inter-branch travel buffer:
    Doctor booked at Clinic A from 10:00 to 10:30.
    With a 30-min travel buffer, doctor cannot be booked at Clinic B until 11:00 AM.
    """
    org = await get_or_create_test_org(test_session)
    clinic_a = make_test_clinic(org.id, name="DHA Clinic")
    clinic_b = make_test_clinic(org.id, name="Gulberg Clinic")
    test_session.add_all([clinic_a, clinic_b])

    # Settings with 30-min travel buffer
    settings = ClinicBookingSettingsORM(
        id=uuid4(),
        clinic_id=None,
        booking_mode="open",
        slot_interval_minutes=15,
        inter_branch_travel_buffer_minutes=30,
        advance_booking_days=60,
    )
    test_session.add(settings)

    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        first_name="Ahmed",
        last_name="Raza",
        display_name="Dr. Ahmed Raza",
        role="Doctor",
        professional_title="Orthodontist",
        is_active=True,
    )
    test_session.add(doctor)

    tz = ZoneInfo("Asia/Karachi")
    target_date = datetime.now(tz).date() + timedelta(days=2)
    dow = target_date.weekday()

    # Clinic hours for Clinic B: 09:00 - 18:00
    wh_b = ClinicWorkingHoursORM(
        id=uuid4(),
        clinic_id=clinic_b.id,
        day_of_week=dow,
        open_time="09:00",
        close_time="18:00",
        is_closed=False,
    )
    test_session.add(wh_b)

    # Doctor shift at Clinic B
    shift_b = ProviderAvailabilityORM(
        id=uuid4(),
        team_member_id=doctor.id,
        clinic_id=clinic_b.id,
        day_of_week=dow,
        start_time="09:00",
        end_time="18:00",
        is_active=True,
        is_draft=False,
    )
    test_session.add(shift_b)

    # Doctor already has an appointment at Clinic A: 10:00 AM (30 mins duration)
    booking_a = BookingORM(
        id=uuid4(),
        confirmation_id="MD-DHA-101",
        clinic_id=clinic_a.id,
        team_member_id=doctor.id,
        preferred_date=target_date,
        preferred_time="10:00 AM",
        patient_full_name="Patient at DHA",
        patient_phone="03001112233",
        phone_normalized="03001112233",
        status="confirmed",
    )
    test_session.add(booking_a)
    await test_session.commit()

    # Query availability for Clinic B
    avail_resp = await client_with_db.get(
        f"/api/v1/public/availability?date={target_date.isoformat()}&clinicId={clinic_b.id}&teamMemberId={doctor.id}"
    )
    assert avail_resp.status_code == 200
    slots_b = avail_resp.json()["slots"]

    # 10:00 AM (during Clinic A appt) must not be available
    assert "10:00 AM" not in slots_b
    # 10:30 AM (during 30-min travel buffer 10:30-11:00) must not be available
    assert "10:30 AM" not in slots_b
    assert "10:45 AM" not in slots_b
    # 11:00 AM (after 30-min travel buffer) must be available
    assert "11:00 AM" in slots_b


@pytest.mark.asyncio
async def test_booking_confirmation_rules_existing_vs_new_vs_special_category(
    client_with_db, test_session
):
    """
    Booking Confirmation Rules:
    1. Existing patient (phone matches patients table) + routine service -> instant 'confirmed'.
    2. New patient (phone not in patients table) -> 'requested' (receptionist approval required).
    3. Special category with requires_approval=True (e.g., Implant Consultation) -> 'requested' even for existing patient.
    """
    client = client_with_db
    org = await get_or_create_test_org(test_session)
    clinic = make_test_clinic(org.id, name="Main Branch")
    test_session.add(clinic)

    # Category 1: Routine (no special approval required)
    cat_routine = AppointmentCategoryORM(
        id=uuid4(),
        name="General Dental Checkup",
        code="general_checkup",
        requires_approval=False,
    )
    # Category 2: Implant Consultation (requires clinical review / approval)
    cat_implant = AppointmentCategoryORM(
        id=uuid4(),
        name="Implant Consultation",
        code="implant_consultation",
        requires_approval=True,
    )
    test_session.add_all([cat_routine, cat_implant])

    # Routine Service
    svc_routine = ServiceORM(
        id=uuid4(),
        slug="routine-clean-and-check",
        title="Routine Clean and Check",
        short_desc="Routine teeth clean and checkup",
        category="General",
        category_id=cat_routine.id,
        cash_price="Rs. 3,000",
        duration="30m",
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    # Implant Service
    svc_implant = ServiceORM(
        id=uuid4(),
        slug="full-arch-implant-eval",
        title="Full Arch Implant Evaluation",
        short_desc="Comprehensive dental implant surgical consultation",
        category="Specialized",
        category_id=cat_implant.id,
        cash_price="Rs. 10,000",
        duration="60m",
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add_all([svc_routine, svc_implant])

    # Seed an existing patient
    existing_patient = PatientORM(
        id=uuid4(),
        first_name="Zainab",
        last_name="Bibi",
        phone="03009998877",
        email="zainab@example.com",
    )
    test_session.add(existing_patient)
    await test_session.flush()

    tz = ZoneInfo("Asia/Karachi")
    target_date = datetime.now(tz).date() + timedelta(days=2)
    dow = target_date.weekday()

    # Branch-scoped authorization chain: AppointmentService strictly validates that
    # the clinic offers the service (ClinicServiceORM), has an assigned active doctor
    # (TeamMemberClinicORM), and that the doctor is authorized for the service at this branch
    # (ServiceProviderORM) with availability. This fixture establishes that valid baseline.
    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=clinic.id,
        first_name="Ayesha",
        last_name="Hussain",
        display_name="Dr. Ayesha Hussain",
        professional_title="BDS, RDS",
        role="doctor",
        is_active=True,
    )
    test_session.add(doctor)
    await test_session.flush()

    test_session.add(TeamMemberClinicORM(team_member_id=doctor.id, clinic_id=clinic.id, is_active=True, is_primary=True))
    test_session.add(ClinicServiceORM(clinic_id=clinic.id, service_id=svc_routine.id, is_active=True))
    test_session.add(ClinicServiceORM(clinic_id=clinic.id, service_id=svc_implant.id, is_active=True))
    test_session.add(ServiceProviderORM(team_member_id=doctor.id, service_id=svc_routine.id, clinic_id=clinic.id, is_active=True))
    test_session.add(ServiceProviderORM(team_member_id=doctor.id, service_id=svc_implant.id, clinic_id=clinic.id, is_active=True))
    test_session.add(
        ProviderAvailabilityORM(
            team_member_id=doctor.id,
            clinic_id=clinic.id,
            day_of_week=dow,
            start_time="09:00",
            end_time="18:00",
            is_active=True,
        )
    )

    wh = ClinicWorkingHoursORM(
        id=uuid4(),
        clinic_id=clinic.id,
        day_of_week=dow,
        open_time="09:00",
        close_time="18:00",
        is_closed=False,
    )
    test_session.add(wh)
    await test_session.commit()

    # Scenario 1: Existing Patient + Routine Service -> 'confirmed'
    resp_existing = await client.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc_routine.id),
            "clinicId": str(clinic.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Zainab Bibi",
            "phone": "03009998877",
            "email": "zainab@example.com",
        },
    )
    assert resp_existing.status_code == 201
    booking_repo = PostgresBookingRepository(test_session)
    bk1 = await booking_repo.get_by_confirmation_id(resp_existing.json()["confirmationId"])
    assert bk1.status == "confirmed"

    # Scenario 2: New Patient + Routine Service -> 'requested' (needs reception review)
    resp_new = await client.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc_routine.id),
            "clinicId": str(clinic.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "11:00 AM",
            "fullName": "Usman Tariq",
            "phone": "03215554433",
            "email": "usman@example.com",
        },
    )
    assert resp_new.status_code == 201
    bk2 = await booking_repo.get_by_confirmation_id(resp_new.json()["confirmationId"])
    assert bk2.status == "requested"

    # Scenario 3: Existing Patient + Implant Consultation (requires_approval=True) -> 'requested'
    resp_implant = await client.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc_implant.id),
            "clinicId": str(clinic.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "02:00 PM",
            "fullName": "Zainab Bibi",
            "phone": "03009998877",
            "email": "zainab@example.com",
        },
    )
    assert resp_implant.status_code == 201
    bk3 = await booking_repo.get_by_confirmation_id(resp_implant.json()["confirmationId"])
    assert bk3.status == "requested"
    assert bk3.approval_required is True


@pytest.mark.asyncio
async def test_receptionist_booking_approval_workflow(
    client_with_db, receptionist_auth, test_session
):
    """
    Receptionist reviews pending booking request:
    - Approve updates status to confirmed and records approved_by_user_id
    - Reject updates status to cancelled with rejection_reason
    """
    client = client_with_db
    rec_headers = receptionist_auth["headers"]

    booking = BookingORM(
        id=uuid4(),
        confirmation_id="MD-REQ-001",
        preferred_date=date.today() + timedelta(days=2),
        preferred_time="10:00 AM",
        patient_full_name="Hamza Ali",
        patient_phone="03007771122",
        phone_normalized="03007771122",
        status="requested",
        approval_required=True,
    )
    test_session.add(booking)
    await test_session.commit()

    # 1. Receptionist approves booking via approvals endpoint
    app_resp = await client.post(
        f"/api/v1/reception/approvals/{booking.id}/approve",
        headers=rec_headers,
    )
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "confirmed"

    # 2. Reject another booking via approvals endpoint
    booking2 = BookingORM(
        id=uuid4(),
        confirmation_id="MD-REQ-002",
        preferred_date=date.today() + timedelta(days=2),
        preferred_time="11:00 AM",
        patient_full_name="Bilal Sheikh",
        patient_phone="03008882233",
        phone_normalized="03008882233",
        status="requested",
        approval_required=True,
    )
    test_session.add(booking2)
    await test_session.commit()

    rej_resp = await client.post(
        f"/api/v1/reception/approvals/{booking2.id}/reject",
        json={"reason": "Doctor unavailable for surgical consult on requested date"},
        headers=rec_headers,
    )
    assert rej_resp.status_code == 200
    assert rej_resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_patient_reschedule_request_and_reception_approval(
    client_with_db, receptionist_auth, test_session
):
    """
    Patient submits reschedule request:
    - Original booking remains active with original date/time.
    - Reception reviews reschedule request.
    - Reception approval atomically re-validates slot and moves appointment to new slot.
    """
    client = client_with_db
    rec_headers = receptionist_auth["headers"]
    org = await get_or_create_test_org(test_session)

    clinic = make_test_clinic(org.id, name="Cantt Branch")
    test_session.add(clinic)

    tz = ZoneInfo("Asia/Karachi")
    orig_date = datetime.now(tz).date() + timedelta(days=3)
    new_date = datetime.now(tz).date() + timedelta(days=4)

    wh_new = ClinicWorkingHoursORM(
        id=uuid4(),
        clinic_id=clinic.id,
        day_of_week=new_date.weekday(),
        open_time="09:00",
        close_time="18:00",
        is_closed=False,
    )
    test_session.add(wh_new)

    booking = BookingORM(
        id=uuid4(),
        confirmation_id="MD-RESCHED-01",
        clinic_id=clinic.id,
        preferred_date=orig_date,
        preferred_time="10:00 AM",
        patient_full_name="Farhan Saeed",
        patient_phone="03004445566",
        phone_normalized="03004445566",
        status="confirmed",
    )
    test_session.add(booking)
    await test_session.commit()

    # 1. Patient submits reschedule request
    req_resp = await client.post(
        "/api/v1/public/booking/reschedule-request",
        json={
            "confirmationId": "MD-RESCHED-01",
            "requestedDate": new_date.isoformat(),
            "requestedTime": "02:00 PM",
            "reason": "Family emergency on original appointment day",
        },
    )
    assert req_resp.status_code == 200
    resched_id = req_resp.json()["requestId"]

    # Original booking MUST still be at orig_date
    booking_repo = PostgresBookingRepository(test_session)
    bk = await booking_repo.get_by_confirmation_id("MD-RESCHED-01")
    assert bk.preferred_date == orig_date

    # 2. Receptionist views pending reschedule requests
    list_resp = await client.get("/api/v1/reception/reschedule-requests", headers=rec_headers)
    assert list_resp.status_code == 200
    pending_list = list_resp.json()
    assert any(r["id"] == resched_id for r in pending_list)

    # 3. Receptionist approves reschedule request
    app_resched_resp = await client.post(
        f"/api/v1/reception/reschedule-requests/{resched_id}/approve",
        headers=rec_headers,
    )
    assert app_resched_resp.status_code == 200

    # Booking preferred_date/time is now officially updated!
    bk_updated = await booking_repo.get_by_confirmation_id("MD-RESCHED-01")
    assert bk_updated.preferred_date == new_date
    assert bk_updated.preferred_time == "02:00 PM"


@pytest.mark.asyncio
async def test_cancellation_workflow_auto_accept_vs_review_queue(
    client_with_db, receptionist_auth, test_session
):
    """
    Cancellation Workflow:
    - >24 hours before appointment: auto-accepted.
    - <=24 hours before appointment: sent to reception review queue.
    """
    client = client_with_db
    rec_headers = receptionist_auth["headers"]

    tz = ZoneInfo("Asia/Karachi")
    now_local = datetime.now(tz)

    # 1. Appointment in 3 days (>24 hours away)
    future_date = (now_local + timedelta(days=3)).date()
    booking_far = BookingORM(
        id=uuid4(),
        confirmation_id="MD-CANCEL-FAR",
        preferred_date=future_date,
        preferred_time="11:00 AM",
        patient_full_name="Imran Khan",
        patient_phone="03001112244",
        phone_normalized="03001112244",
        status="confirmed",
    )
    # 2. Appointment in 4 hours (<=24 hours away)
    near_date = now_local.date()
    near_time = (now_local + timedelta(hours=4)).strftime("%I:%M %p")
    booking_near = BookingORM(
        id=uuid4(),
        confirmation_id="MD-CANCEL-NEAR",
        preferred_date=near_date,
        preferred_time=near_time,
        patient_full_name="Amina Malik",
        patient_phone="03005556677",
        phone_normalized="03005556677",
        status="confirmed",
    )
    test_session.add_all([booking_far, booking_near])
    await test_session.commit()

    # Cancel FAR (>24h) -> auto accepted
    resp_far = await client.post(
        "/api/v1/public/booking/cancel-request",
        json={"confirmationId": "MD-CANCEL-FAR", "reason": "Traveling abroad"},
    )
    assert resp_far.status_code == 200
    assert resp_far.json()["autoAccepted"] is True
    booking_repo = PostgresBookingRepository(test_session)
    bk_far = await booking_repo.get_by_confirmation_id("MD-CANCEL-FAR")
    assert bk_far.status == "cancelled"

    # Cancel NEAR (<=24h) -> sent to review queue
    resp_near = await client.post(
        "/api/v1/public/booking/cancel-request",
        json={"confirmationId": "MD-CANCEL-NEAR", "reason": "Sudden headache"},
    )
    assert resp_near.status_code == 200
    assert resp_near.json()["autoAccepted"] is False

    # Reception views cancellation review queue
    q_resp = await client.get("/api/v1/reception/cancellation-requests", headers=rec_headers)
    assert q_resp.status_code == 200
    requests = q_resp.json()
    assert any(r["confirmationId"] == "MD-CANCEL-NEAR" for r in requests)
    req_id = next(r["id"] for r in requests if r["confirmationId"] == "MD-CANCEL-NEAR")

    # Reception reviews and accepts cancellation via approve endpoint
    rev_resp = await client.post(
        f"/api/v1/reception/cancellation-requests/{req_id}/approve",
        headers=rec_headers,
    )
    assert rev_resp.status_code == 200
    bk_near = await booking_repo.get_by_confirmation_id("MD-CANCEL-NEAR")
    assert bk_near.status == "cancelled"


@pytest.mark.asyncio
async def test_notification_pipeline_whatsapp_sms_fallback_and_task_escalation(
    test_session
):
    """
    Notification Pipeline:
    - WhatsApp-first delivery.
    - If WhatsApp fails, SMS fallback.
    - Max 2 attempts.
    - If all fail, task escalated to receptionist triage desk. Booking remains intact!
    """
    from app.application.services.messaging_provider import MessageDeliveryResult, MessagingProvider
    from app.application.services.notification_pipeline_service import NotificationPipelineService

    class AlwaysFailingProvider(MessagingProvider):
        @property
        def is_configured(self) -> bool:
            return True

        async def send_message(self, recipient: str, message: str, channel: str = "generic", metadata=None) -> MessageDeliveryResult:
            return MessageDeliveryResult(
                success=False,
                status="failed",
                channel=channel,
                provider="test_failing",
                recipient=recipient,
                error="Carrier network unavailable",
            )

    class AlwaysSucceedingProvider(MessagingProvider):
        @property
        def is_configured(self) -> bool:
            return True

        async def send_message(self, recipient: str, message: str, channel: str = "sms", metadata=None) -> MessageDeliveryResult:
            return MessageDeliveryResult(
                success=True,
                status="sent",
                channel=channel,
                provider=channel,
                provider_message_id=f"TEST-{uuid4()}",
                recipient=recipient,
            )

    booking = BookingORM(
        id=uuid4(),
        confirmation_id="MD-NOTIF-01",
        patient_full_name="Kashif Mehmood",
        patient_phone="03001239988",
        phone_normalized="03001239988",
        preferred_date=date.today() + timedelta(days=1),
        preferred_time="03:00 PM",
        status="confirmed",
    )
    test_session.add(booking)
    await test_session.commit()

    # Case 1: WhatsApp Success
    pipeline_normal = NotificationPipelineService(
        session=test_session,
        whatsapp_provider=AlwaysSucceedingProvider(),
    )
    res_success = await pipeline_normal.notify_booking_event(
        booking_id=booking.id,
        event_type="booking_confirmed",
        patient_name="Kashif Mehmood",
        patient_phone="03001239988",
        details={"confirmation_id": "MD-NOTIF-01", "date": "2026-11-02", "time": "03:00 PM"},
    )
    assert res_success["success"] is True
    assert res_success["channel"] == "whatsapp"
    assert res_success["attempts"] == 1

    # Case 2: WhatsApp Failure -> SMS Fallback Success
    booking_fallback = BookingORM(
        id=uuid4(),
        confirmation_id="MD-NOTIF-02",
        patient_full_name="Kashif Mehmood",
        patient_phone="03001239988",
        phone_normalized="03001239988",
        preferred_date=date.today() + timedelta(days=1),
        preferred_time="03:00 PM",
        status="confirmed",
    )
    test_session.add(booking_fallback)
    await test_session.commit()

    pipeline_fallback = NotificationPipelineService(
        session=test_session,
        whatsapp_provider=AlwaysFailingProvider(),
        sms_provider=AlwaysSucceedingProvider(),
    )
    res_fallback = await pipeline_fallback.notify_booking_event(
        booking_id=booking_fallback.id,
        event_type="booking_confirmed",
        patient_name="Kashif Mehmood",
        patient_phone="03001239988",
        details={"confirmation_id": "MD-NOTIF-02", "date": "2026-11-02", "time": "03:00 PM"},
    )
    assert res_fallback["success"] is True
    assert res_fallback["channel"] == "sms"
    assert res_fallback["attempts"] == 2

    # Case 3: Both WhatsApp & SMS fail -> Escalation task created, booking intact!
    booking_escalate = BookingORM(
        id=uuid4(),
        confirmation_id="MD-NOTIF-03",
        patient_full_name="Kashif Mehmood",
        patient_phone="03001239988",
        phone_normalized="03001239988",
        preferred_date=date.today() + timedelta(days=1),
        preferred_time="03:00 PM",
        status="confirmed",
    )
    test_session.add(booking_escalate)
    await test_session.commit()

    pipeline_escalate = NotificationPipelineService(
        session=test_session,
        whatsapp_provider=AlwaysFailingProvider(),
        sms_provider=AlwaysFailingProvider(),
    )
    res_escalate = await pipeline_escalate.notify_booking_event(
        booking_id=booking_escalate.id,
        event_type="booking_confirmed",
        patient_name="Kashif Mehmood",
        patient_phone="03001239988",
        details={"confirmation_id": "MD-NOTIF-03", "date": "2026-11-02", "time": "03:00 PM"},
    )
    assert res_escalate["success"] is False
    assert res_escalate["attempts"] == 2
    assert res_escalate["escalated_task_id"] is not None

    # Check task created in TaskORM
    task_res = await test_session.execute(
        select(TaskORM).where(TaskORM.id == UUID(res_escalate["escalated_task_id"]))
    )
    escalation_task = task_res.scalar_one_or_none()
    assert escalation_task is not None
    assert escalation_task.priority == "high"
    assert "call the patient directly" in escalation_task.description.lower()

    # Booking must still be intact and confirmed
    assert booking_escalate.status == "confirmed"
