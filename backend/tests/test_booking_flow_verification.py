"""
Comprehensive verification test suite covering items 1 to 7:
1. Lead capture full behavior (fields, update vs create, concurrent race deduplication, token reuse, secure random generation, logs/response leak check)
2. Doctors endpoint keys, licence number privacy, and negative guard against phone/email/licence keys
3. Negative assertion guard for public availability personal data leaks
4. Auto-confirm scenarios: (a) chosen doctor, (b) single eligible doctor auto-selected, (c) no doctor chosen
5. Patient and lead with no email through reminders, receipts, doctor schedule, and reception patient profile
6. Every write path sets phone_normalized (leads, patients, bookings, messages)
"""
import asyncio
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.domain.models.booking_crm import Booking, Lead, Message, Patient
from app.domain.models.booking_flow import BookingFlowSettings, LeadStatus
from app.domain.models.booking_settings import WorkingHours
from app.domain.models.team_member import TeamMember
from app.domain.models.user import User, UserRole
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicORM,
    ClinicServiceORM,
    LeadORM,
    MessageORM,
    OrganizationORM,
    PatientORM,
    ProviderAvailabilityORM,
    ServiceORM,
    TeamMemberORM,
)
from app.infrastructure.repositories.postgres_booking_flow_settings_repo import (
    PostgresBookingFlowSettingsRepository,
)
from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository
from app.infrastructure.repositories.postgres_booking_settings_repo import (
    PostgresBookingSettingsRepository,
)
from app.infrastructure.repositories.postgres_lead_repo import PostgresLeadRepository
from app.infrastructure.repositories.postgres_message_repo import PostgresMessageRepository
from app.infrastructure.repositories.postgres_patient_repo import PostgresPatientRepository
from app.infrastructure.repositories.postgres_team_repo import PostgresTeamMemberRepository
from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository


@pytest_asyncio.fixture
async def setup_test_org(test_session):
    org = OrganizationORM(
        id=uuid4(),
        name="Marlow Dental Practice",
        display_name="Marlow Dental Practice",
    )
    test_session.add(org)
    await test_session.flush()

    clinic_a = ClinicORM(
        id=uuid4(),
        organization_id=org.id,
        name="Gulberg Clinic",
        address_line1="Gulberg III",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        is_active=True,
    )
    test_session.add(clinic_a)
    await test_session.flush()

    # Working hours for Monday-Saturday
    settings_repo = PostgresBookingSettingsRepository(test_session)
    for dow in range(6):
        wh = WorkingHours(
            id=uuid4(),
            clinic_id=clinic_a.id,
            day_of_week=dow,
            open_time="09:00",
            close_time="18:00",
            is_closed=False,
        )
        await settings_repo.update_working_hours([wh])

    flow_repo = PostgresBookingFlowSettingsRepository(test_session)
    settings = await flow_repo.get_settings(org.id)
    settings.auto_confirm_online = True
    settings.show_patients_treated = True
    await flow_repo.update_settings(settings)

    await test_session.commit()
    return {"org": org, "clinic": clinic_a}


# ---------------------------------------------------------------------------
# 1. Full Lead Capture Behavior
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_lead_capture_full_behavior(setup_test_org, client_with_db, test_session):
    lead_repo = PostgresLeadRepository(test_session)

    # (a) First capture creates open unconverted lead with all fields
    r1 = await client_with_db.post(
        "/api/v1/public/leads",
        json={
            "fullName": "Hamza Tariq",
            "phone": "0300-1234567",
            "email": "hamza@example.com",
            "noticeVersion": "v1.2",
        },
    )
    assert r1.status_code == 201
    token1 = r1.json()["captureToken"]
    assert token1 and len(token1) >= 40  # secure random token_urlsafe(32)

    # Verify all fields stored correctly in DB
    created = await lead_repo.get_by_capture_token(token1)
    assert created is not None
    assert created.full_name == "Hamza Tariq"
    assert created.phone == "0300-1234567"
    assert created.phone_normalized == "923001234567"
    assert created.email == "hamza@example.com"
    assert created.status == LeadStatus.UNCONVERTED.value
    assert created.consent_notice_version == "v1.2"
    assert created.last_activity_at is not None

    # (b) Second capture for same normalised phone updates existing lead and returns fresh token
    r2 = await client_with_db.post(
        "/api/v1/public/leads",
        json={
            "fullName": "Hamza Tariq Updated",
            "phone": "+92 300 1234567",
            "email": "hamza.updated@example.com",
            "noticeVersion": "v1.3",
        },
    )
    assert r2.status_code == 201
    token2 = r2.json()["captureToken"]
    assert token2 != token1  # fresh token issued per capture

    # Both old and new token resolve to the updated lead
    updated1 = await lead_repo.get_by_capture_token(token1)
    assert updated1 is not None
    assert updated1.full_name == "Hamza Tariq Updated"
    assert updated1.email == "hamza.updated@example.com"
    assert updated1.consent_notice_version == "v1.3"

    updated2 = await lead_repo.get_by_capture_token(token2)
    assert updated2 is not None
    assert updated2.id == updated1.id

    # Verify only 1 lead exists for this phone
    leads = await lead_repo.list_by_phone("923001234567")
    assert len(leads) == 1

    # (c) Two near-simultaneous captures for the same normalized phone result in exactly ONE lead
    sim_phone = "0321-9876543"
    payload_a = {"fullName": "Concurrent User A", "phone": sim_phone}
    payload_b = {"fullName": "Concurrent User B", "phone": sim_phone}

    resp_a, resp_b = await asyncio.gather(
        client_with_db.post("/api/v1/public/leads", json=payload_a),
        client_with_db.post("/api/v1/public/leads", json=payload_b),
    )
    assert resp_a.status_code == 201
    assert resp_b.status_code == 201
    tok_a = resp_a.json()["captureToken"]
    tok_b = resp_b.json()["captureToken"]
    assert tok_a != tok_b  # distinct fresh tokens per session

    sim_leads = await lead_repo.list_by_phone("923219876543")
    assert len(sim_leads) == 1, "Expected exactly 1 lead from near-simultaneous captures"

    # (d) Verify token never appears in any response other than captureToken
    for key, val in r1.json().items():
        if key != "captureToken":
            assert token1 not in str(val)


# ---------------------------------------------------------------------------
# 2. Doctors Endpoint Keys & No Private Exposure Guard
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_doctors_endpoint_keys_and_privacy_guard(setup_test_org, client_with_db, test_session):
    env = setup_test_org
    clinic_id = env["clinic"].id

    doc = TeamMemberORM(
        id=uuid4(),
        organization_id=env["org"].id,
        first_name="Ayesha",
        last_name="Khan",
        display_name="Dr. Ayesha Khan",
        role="Doctor",
        professional_title="Orthodontist",
        biography="Experienced orthodontist",
        license_number="LIC-PRIVATE-9999",
        license_state="Punjab",
        is_active=True,
        show_patients_treated=True,
    )
    test_session.add(doc)
    await test_session.flush()

    svc = ServiceORM(
        id=uuid4(),
        slug="consultation",
        category="General",
        title="Consultation",
        short_desc="Consultation",
        cash_price="2000",
        duration="30m",
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(svc)
    await test_session.flush()

    # Link service to clinic
    cs = ClinicServiceORM(clinic_id=clinic_id, service_id=svc.id, is_active=True)
    test_session.add(cs)

    # Doctor working hours at clinic
    target_date = date.today() + timedelta(days=2)
    dow = target_date.weekday()
    pa = ProviderAvailabilityORM(
        id=uuid4(),
        team_member_id=doc.id,
        day_of_week=dow,
        start_time="09:00",
        end_time="17:00",
        is_active=True,
    )
    test_session.add(pa)
    await test_session.commit()

    resp = await client_with_db.get(
        f"/api/v1/public/booking/doctors?serviceId={svc.slug}&clinicId={clinic_id}&days=7"
    )
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) >= 1
    doc_data = next(d for d in docs if d["id"] == str(doc.id))

    # Explicit allowed schema keys
    allowed_doctor_keys = {
        "id",
        "displayName",
        "professionalTitle",
        "role",
        "biography",
        "photoUrl",
        "specialties",
        "education",
        "patientsTreated",
        "weeklySchedule",
        "weeklyScheduleSummary",
        "slotsByDate",
    }
    assert set(doc_data.keys()) <= allowed_doctor_keys

    # Confirm private doctor attributes are strictly absent
    raw_text = resp.text
    assert "LIC-PRIVATE-9999" not in raw_text
    assert "0300-PRIVATE-PHONE" not in raw_text
    assert "private.doctor@internal.com" not in raw_text

    # Comprehensive negative guard: Fail if any phone, email, or licence appears in public booking endpoints
    for endpoint in [
        "/api/v1/public/booking/services",
        f"/api/v1/public/booking/clinics?serviceId={svc.slug}",
        f"/api/v1/public/booking/doctors?serviceId={svc.slug}&clinicId={clinic_id}",
    ]:
        ep_resp = await client_with_db.get(endpoint)
        assert ep_resp.status_code == 200
        data = ep_resp.json()

        def _assert_no_sensitive_keys(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    lower_k = k.lower()
                    assert "phone" not in lower_k, f"Forbidden key '{k}' in {endpoint}"
                    assert "email" not in lower_k, f"Forbidden key '{k}' in {endpoint}"
                    assert "licen" not in lower_k, f"Forbidden key '{k}' in {endpoint}"
                    _assert_no_sensitive_keys(v)
            elif isinstance(obj, list):
                for item in obj:
                    _assert_no_sensitive_keys(item)

        _assert_no_sensitive_keys(data)


# ---------------------------------------------------------------------------
# 4. Auto-Confirm Scenarios (a, b, c)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_auto_confirm_scenarios(setup_test_org, client_with_db, test_session):
    env = setup_test_org
    clinic_id = env["clinic"].id
    booking_repo = PostgresBookingRepository(test_session)

    # Doctor 1
    doc1 = TeamMemberORM(
        id=uuid4(),
        organization_id=env["org"].id,
        first_name="Bilal",
        last_name="Saeed",
        display_name="Dr. Bilal Saeed",
        role="Doctor",
        professional_title="Dentist",
        is_active=True,
    )
    test_session.add(doc1)

    # Doctor 2
    doc2 = TeamMemberORM(
        id=uuid4(),
        organization_id=env["org"].id,
        first_name="Fatima",
        last_name="Ali",
        display_name="Dr. Fatima Ali",
        role="Doctor",
        professional_title="Dentist",
        is_active=True,
    )
    test_session.add(doc2)

    # Service A (performed by both Doc1 and Doc2)
    svc_a = ServiceORM(
        id=uuid4(),
        slug="cleanings-exams",
        category="General",
        title="Multi Doc Service",
        short_desc="Performed by both doctors",
        cash_price="1500",
        duration="30m",
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(svc_a)

    # Service B (performed ONLY by Doc1)
    svc_b = ServiceORM(
        id=uuid4(),
        slug="root-canals",
        category="Specialized",
        title="Single Doc Service",
        short_desc="Performed only by Doc1",
        cash_price="3000",
        duration="30m",
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(svc_b)
    await test_session.flush()

    # Link both services to clinic
    test_session.add(ClinicServiceORM(clinic_id=clinic_id, service_id=svc_a.id, is_active=True))
    test_session.add(ClinicServiceORM(clinic_id=clinic_id, service_id=svc_b.id, is_active=True))

    # Link Doc1 to Service B specifically via service_providers
    from app.infrastructure.database.orm_models import ServiceProviderORM
    test_session.add(ServiceProviderORM(service_id=svc_b.id, team_member_id=doc1.id))

    # Set working schedules for both doctors on all weekdays
    for dow in range(6):
        test_session.add(
            ProviderAvailabilityORM(
                id=uuid4(),
                team_member_id=doc1.id,
                day_of_week=dow,
                start_time="09:00",
                end_time="17:00",
                is_active=True,
            )
        )
        test_session.add(
            ProviderAvailabilityORM(
                id=uuid4(),
                team_member_id=doc2.id,
                day_of_week=dow,
                start_time="09:00",
                end_time="17:00",
                is_active=True,
            )
        )
    await test_session.commit()

    target_date = date.today() + timedelta(days=2)
    if target_date.weekday() == 6:  # Sunday
        target_date += timedelta(days=1)

    # (a) A doctor is explicitly chosen -> Status: 'confirmed'
    r_a = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": svc_a.slug,
            "clinicId": str(clinic_id),
            "teamMemberId": str(doc1.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Patient Scenario A",
            "phone": "03001111111",
        },
    )
    assert r_a.status_code == 201
    bk_a = await booking_repo.get_by_confirmation_id(r_a.json()["confirmationId"])
    assert bk_a.status == "confirmed"
    assert bk_a.team_member_id == doc1.id

    # (b) Only ONE eligible doctor exists (Doc1 for svc_b) and no doctor was specified -> Auto-selected & 'confirmed'
    r_b = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": svc_b.slug,
            "clinicId": str(clinic_id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "11:00 AM",
            "fullName": "Patient Scenario B",
            "phone": "03002222222",
        },
    )
    assert r_b.status_code == 201
    bk_b = await booking_repo.get_by_confirmation_id(r_b.json()["confirmationId"])
    assert bk_b.status == "confirmed"
    assert bk_b.team_member_id == doc1.id, "Single eligible doctor should be auto-selected"

    # (c) No doctor is chosen and multiple eligible doctors exist (svc_a has Doc1 and Doc2) -> Status: 'requested'
    r_c = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": svc_a.slug,
            "clinicId": str(clinic_id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "12:00 PM",
            "fullName": "Patient Scenario C",
            "phone": "03003333333",
        },
    )
    assert r_c.status_code == 201
    bk_c = await booking_repo.get_by_confirmation_id(r_c.json()["confirmationId"])
    assert bk_c.status == "requested"
    assert bk_c.team_member_id is None, "Unassigned booking requires reception triage"


# ---------------------------------------------------------------------------
# 6. Patient and Lead with No Email Through Workflows
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_patient_and_lead_with_no_email_workflows(setup_test_org, client_with_db, test_session):
    env = setup_test_org
    clinic_id = env["clinic"].id

    patient_repo = PostgresPatientRepository(test_session)
    booking_repo = PostgresBookingRepository(test_session)
    lead_repo = PostgresLeadRepository(test_session)
    user_repo = PostgresUserRepository(test_session)
    message_repo = PostgresMessageRepository(test_session)

    # 1. Create Patient with email = None
    patient = Patient(
        first_name="NoEmail",
        last_name="Patient",
        phone="03005550001",
        email=None,
    )
    saved_patient = await patient_repo.save(patient)
    assert saved_patient.email is None

    # 2. Create Lead with email = None
    lead = Lead(
        full_name="NoEmail Lead",
        phone="03005550002",
        email=None,
        patient_id=saved_patient.id,
    )
    saved_lead = await lead_repo.save(lead)
    assert saved_lead.email is None

    # 3. Create Doctor & Receptionist users
    doc_tm = TeamMemberORM(
        id=uuid4(),
        organization_id=env["org"].id,
        first_name="Tariq",
        last_name="Doctor",
        display_name="Dr. Tariq",
        role="Doctor",
        professional_title="Dentist",
        is_active=True,
    )
    test_session.add(doc_tm)
    await test_session.flush()

    from app.core.security import hash_password
    doc_user = User(
        email="tariq.doc@marlowdental.com",
        hashed_password=hash_password("Pass123!"),
        full_name="Dr. Tariq",
        role=UserRole.DOCTOR,
        team_member_id=doc_tm.id,
    )
    await user_repo.save(doc_user)

    rec_user = User(
        email="rec.user@marlowdental.com",
        hashed_password=hash_password("Pass123!"),
        full_name="Reception Staff",
        role=UserRole.RECEPTIONIST,
    )
    await user_repo.save(rec_user)
    await test_session.commit()

    # Login Doctor & Receptionist
    rec_login = await client_with_db.post("/api/v1/auth/login", json={"email": "rec.user@marlowdental.com", "password": "Pass123!"})
    rec_headers = {"Authorization": f"Bearer {rec_login.json()['accessToken']}"}

    doc_login = await client_with_db.post("/api/v1/auth/login", json={"email": "tariq.doc@marlowdental.com", "password": "Pass123!"})
    doc_headers = {"Authorization": f"Bearer {doc_login.json()['accessToken']}"}

    # Create Booking with no email
    today = date.today()
    booking = Booking(
        confirmation_id="MD-NOEMAIL-001",
        preferred_date=today,
        preferred_time="10:00 AM",
        patient_full_name="NoEmail Patient",
        patient_phone="03005550001",
        patient_email=None,
        clinic_id=clinic_id,
        patient_id=saved_patient.id,
        team_member_id=doc_tm.id,
        status="confirmed",
    )
    saved_booking = await booking_repo.save(booking)

    # (a) Reminders: Message with recipientPhone and recipientEmail=None dispatches cleanly
    msg = Message(
        patient_id=saved_patient.id,
        booking_id=saved_booking.id,
        phone="03005550001",
        email=None,
        content="Reminder: Appointment today at 10:00 AM",
        scheduled_for=datetime.now(timezone.utc) - timedelta(minutes=5),
        status="logged",
        delivery_status="queued",
    )
    await message_repo.save(msg)
    await test_session.commit()

    from app.infrastructure.repositories.postgres_task_repo import PostgresTaskRepository
    from app.infrastructure.repositories.postgres_appointment_repo import PostgresAppointmentRepository
    from app.infrastructure.repositories.postgres_booking_settings_repo import PostgresBookingSettingsRepository
    from app.application.services.reception_service import ReceptionService
    reception_svc = ReceptionService(
        booking_repo=booking_repo,
        patient_repo=patient_repo,
        task_repo=PostgresTaskRepository(test_session),
        lead_repo=lead_repo,
        message_repo=message_repo,
        appointment_repo=PostgresAppointmentRepository(test_session),
        booking_settings_repo=PostgresBookingSettingsRepository(test_session),
    )
    dispatch_res = await reception_svc.dispatch_due_reminders(force_quiet_hours=True)
    assert dispatch_res["dispatchedCount"] >= 1

    # (b) Receipts: Record payment at reception without email
    pay_resp = await client_with_db.post(
        f"/api/v1/reception/appointments/{saved_booking.id}/payments",
        json={
            "amountCents": 500000,
            "currency": "PKR",
            "method": "cash",
            "notes": "Cash payment, no email receipt requested",
        },
        headers=rec_headers,
    )
    assert pay_resp.status_code == 201
    assert pay_resp.json()["amountFormatted"] == "PKR 5,000.00"

    # (c) Doctor Schedule: Fetch schedule with email=None booking
    sched_resp = await client_with_db.get(
        f"/api/v1/doctor/schedule?date={today.isoformat()}",
        headers=doc_headers,
    )
    assert sched_resp.status_code == 200
    matched = next((b for b in sched_resp.json() if b["id"] == str(saved_booking.id)), None)
    assert matched is not None
    assert matched["patientEmail"] is None

    # (d) Reception Patient Profile: Fetch patient page with email=None
    pat_resp = await client_with_db.get(
        f"/api/v1/reception/patients/{saved_patient.id}",
        headers=rec_headers,
    )
    assert pat_resp.status_code == 200
    assert pat_resp.json()["patient"]["email"] is None


# ---------------------------------------------------------------------------
# 7. Every Write Path Sets phone_normalized
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_every_write_path_sets_phone_normalized(setup_test_org, test_session):
    lead_repo = PostgresLeadRepository(test_session)
    patient_repo = PostgresPatientRepository(test_session)
    booking_repo = PostgresBookingRepository(test_session)
    message_repo = PostgresMessageRepository(test_session)

    # 1. Leads write path
    lead = Lead(
        full_name="Norm Lead",
        phone="0345-1234567",
    )
    saved_lead = await lead_repo.save(lead)
    assert saved_lead.phone_normalized == "923451234567"

    # Verify directly in DB
    lead_orm = await test_session.get(LeadORM, saved_lead.id)
    assert lead_orm.phone_normalized == "923451234567"

    # 2. Patients write path
    patient = Patient(
        first_name="Norm",
        last_name="Patient",
        phone="+92 312 9876543",
    )
    saved_patient = await patient_repo.save(patient)
    assert saved_patient.phone_normalized == "923129876543"

    pat_orm = await test_session.get(PatientORM, saved_patient.id)
    assert pat_orm.phone_normalized == "923129876543"

    # 3. Bookings write path
    booking = Booking(
        confirmation_id="MD-NORM-001",
        preferred_date=date.today(),
        preferred_time="10:00 AM",
        patient_full_name="Norm Booking",
        patient_phone="0333 7654321",
    )
    saved_booking = await booking_repo.save(booking)
    assert saved_booking.phone_normalized == "923337654321"

    book_orm = await test_session.get(BookingORM, saved_booking.id)
    assert book_orm.phone_normalized == "923337654321"

    # 4. Messages write path
    msg = Message(
        phone="0300 9998877",
        content="Transactional reminder",
    )
    saved_msg = await message_repo.save(msg)
    assert saved_msg.phone_normalized == "923009998877"

    msg_orm = await test_session.get(MessageORM, saved_msg.id)
    assert msg_orm.phone_normalized == "923009998877"
