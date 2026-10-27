import asyncio
import pytest
import pytest_asyncio
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import get_db_session
from app.main import app
from app.application.services.booking_eligibility_service import BookingEligibilityService
from app.domain.models.booking_crm import Booking, Lead, Patient
from app.domain.models.booking_flow import BookingFlowSettings, LeadStatus
from app.domain.models.booking_settings import BookingSettings, ClinicClosure, WorkingHours
from app.domain.models.service import Service
from app.infrastructure.database.orm_models import (
    Base,
    BookingFlowSettingsORM,
    BookingORM,
    ClinicBookingSettingsORM,
    ClinicClosureORM,
    ClinicORM,
    ClinicServiceORM,
    ClinicWorkingHoursORM,
    LeadCaptureTokenORM,
    LeadEventORM,
    LeadORM,
    OrganizationORM,
    PatientORM,
    ProviderAvailabilityORM,
    ServiceORM,
    ServiceProviderORM,
    TeamMemberORM,
)


@pytest_asyncio.fixture
async def seed_booking_env(test_session: AsyncSession):
    """
    Seeds a realistic multi-clinic, multi-doctor dental environment:
    - Organization: Marlow Dental
    - Clinics: Clinic A (Gulberg), Clinic B (DHA)
    - Doctors: Dr. Tariq (Clinic A), Dr. Sara (both), Dr. Hamza (Clinic B, no slots)
    - Services:
        * cleanings-exams (S1): offered at Clinic A & B, performed by Dr. Tariq & Dr. Sara
        * root-canals (S2): offered at Clinic A, empty provider set (all active doctors at Clinic A)
        * invisalign (S3): offered at Clinic B, but no doctor performs it
        * emergency (S4): offered at Clinic A, performed by Dr. Off (has no working shifts)
        * whitening (S5): inactive service (not bookable)
    """
    org_id = uuid4()
    org = OrganizationORM(
        id=org_id,
        name="Marlow Dental Practice",
        display_name="Marlow Dental Practice",
    )
    test_session.add(org)

    # 1. Flow settings & Clinic booking settings
    flow_settings = BookingFlowSettingsORM(
        organization_id=org_id,
        followup_gaps_minutes=[10, 1440, 2880],
        max_attempts=3,
        cold_wait_hours=24,
        hold_minutes=30,
        auto_confirm_online=True,
        days_shown=7,
        show_patients_treated=True,
        lead_capture_notice="We save your details to help you finish booking.",
    )
    test_session.add(flow_settings)

    clinic_settings = ClinicBookingSettingsORM(
        booking_mode="open",
        advance_booking_days=30,
        slot_interval_minutes=30,
    )
    test_session.add(clinic_settings)

    # Standard working hours (Mon-Sat 08:00 to 20:00, Sun closed)
    for dow in range(7):
        is_closed = dow == 6
        wh = ClinicWorkingHoursORM(
            day_of_week=dow,
            open_time=None if is_closed else "08:00",
            close_time=None if is_closed else "20:00",
            is_closed=is_closed,
        )
        test_session.add(wh)

    # 2. Clinics
    clinic_a_id = uuid4()
    clinic_a = ClinicORM(
        id=clinic_a_id,
        organization_id=org_id,
        name="Marlow Gulberg Branch",
        address_line1="12-C Main Boulevard, Gulberg III",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        phone="04235751234",
        is_active=True,
    )
    clinic_b_id = uuid4()
    clinic_b = ClinicORM(
        id=clinic_b_id,
        organization_id=org_id,
        name="Marlow DHA Branch",
        address_line1="45-J Commercial Area, Phase 5",
        city="Lahore",
        state="Punjab",
        postal_code="54792",
        phone="04235894567",
        is_active=True,
    )
    test_session.add_all([clinic_a, clinic_b])

    # 3. Doctors
    doc_tariq_id = uuid4()
    doc_tariq = TeamMemberORM(
        id=doc_tariq_id,
        organization_id=org_id,
        clinic_id=clinic_a_id,
        first_name="Tariq",
        last_name="Mahmood",
        display_name="Dr. Tariq Mahmood",
        professional_title="BDS, RDS (Oral Surgery)",
        role="doctor",
        is_active=True,
        show_patients_treated=True,
    )

    doc_sara_id = uuid4()
    doc_sara = TeamMemberORM(
        id=doc_sara_id,
        organization_id=org_id,
        clinic_id=None,  # works across clinics
        first_name="Sara",
        last_name="Khan",
        display_name="Dr. Sara Khan",
        professional_title="BDS, FCPS (Endodontics)",
        role="doctor",
        is_active=True,
        show_patients_treated=True,
    )

    doc_off_id = uuid4()
    doc_off = TeamMemberORM(
        id=doc_off_id,
        organization_id=org_id,
        clinic_id=clinic_a_id,
        first_name="Zahid",
        last_name="Off",
        display_name="Dr. Zahid Off",
        professional_title="BDS",
        role="doctor",
        is_active=True,
        show_patients_treated=False,
    )
    test_session.add_all([doc_tariq, doc_sara, doc_off])

    # Doctor working schedule in provider_availabilities (Mon-Fri 09:00 - 17:00)
    for dow in range(5):
        test_session.add(
            ProviderAvailabilityORM(
                team_member_id=doc_tariq_id,
                day_of_week=dow,
                start_time="09:00",
                end_time="17:00",
                is_active=True,
            )
        )
        test_session.add(
            ProviderAvailabilityORM(
                team_member_id=doc_sara_id,
                day_of_week=dow,
                start_time="09:00",
                end_time="17:00",
                is_active=True,
            )
        )
    # Dr. Off only has shifts on Sunday (day_of_week=6, when clinic is closed), so has 0 slots in horizon
    test_session.add(
        ProviderAvailabilityORM(
            team_member_id=doc_off_id,
            day_of_week=6,
            start_time="09:00",
            end_time="17:00",
            is_active=True,
        )
    )

    # 4. Services
    s1_id = uuid4()
    s1 = ServiceORM(
        id=s1_id,
        slug="cleanings-exams",
        category="General",
        title="Comprehensive Checkup & Cleaning",
        short_desc="Routine examination, scaling, and polish",
        duration="30 min",
        cash_price=5000.0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )

    s2_id = uuid4()
    s2 = ServiceORM(
        id=s2_id,
        slug="root-canals",
        category="Endodontics",
        title="Microscopic Root Canal Therapy",
        short_desc="Painless single-visit endodontic treatment",
        duration="60 min",
        cash_price=18000.0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )

    s3_id = uuid4()
    s3 = ServiceORM(
        id=s3_id,
        slug="invisalign",
        category="Orthodontics",
        title="Clear Aligners Orthodontics",
        short_desc="Custom clear orthodontic aligners",
        duration="45 min",
        cash_price=150000.0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )

    s4_id = uuid4()
    s4 = ServiceORM(
        id=s4_id,
        slug="emergency",
        category="Emergency",
        title="Emergency Toothache Relief",
        short_desc="Urgent dental intervention",
        duration="30 min",
        cash_price=7000.0,
        is_active=True,
        is_public=True,
        bookable_online=True,
    )

    s5_id = uuid4()
    s5 = ServiceORM(
        id=s5_id,
        slug="whitening",
        category="Cosmetic",
        title="Laser Teeth Whitening",
        short_desc="Professional in-chair whitening",
        duration="60 min",
        cash_price=25000.0,
        is_active=False,  # Inactive
        is_public=False,
        bookable_online=False,
    )
    test_session.add_all([s1, s2, s3, s4, s5])

    # 5. Clinic-Service Matrix (clinic_services)
    # S1 at Clinic A and B
    test_session.add(ClinicServiceORM(clinic_id=clinic_a_id, service_id=s1_id, is_active=True))
    test_session.add(ClinicServiceORM(clinic_id=clinic_b_id, service_id=s1_id, is_active=True))
    # S2 at Clinic A only
    test_session.add(ClinicServiceORM(clinic_id=clinic_a_id, service_id=s2_id, is_active=True))
    # S3 at Clinic B only
    test_session.add(ClinicServiceORM(clinic_id=clinic_b_id, service_id=s3_id, is_active=True))
    # S4 at Clinic A only
    test_session.add(ClinicServiceORM(clinic_id=clinic_a_id, service_id=s4_id, is_active=True))

    # 6. Service Provider Links (service_providers)
    # S1 performed by Dr. Tariq and Dr. Sara
    test_session.add(ServiceProviderORM(service_id=s1_id, team_member_id=doc_tariq_id))
    test_session.add(ServiceProviderORM(service_id=s1_id, team_member_id=doc_sara_id))
    # S2 has NO provider rows -> all active doctors at that clinic (Dr. Tariq, Dr. Sara)
    # S3 linked to a doctor that doesn't belong to Clinic B
    unrelated_doc_id = uuid4()
    test_session.add(
        TeamMemberORM(
            id=unrelated_doc_id,
            organization_id=org_id,
            clinic_id=clinic_a_id,  # belongs to Clinic A, not B
            first_name="Unrelated",
            last_name="Doctor",
            display_name="Dr. Unrelated",
            professional_title="BDS",
            role="doctor",
            is_active=True,
        )
    )
    test_session.add(ServiceProviderORM(service_id=s3_id, team_member_id=unrelated_doc_id))
    # S4 linked to Dr. Off (has no availability shifts)
    test_session.add(ServiceProviderORM(service_id=s4_id, team_member_id=doc_off_id))

    await test_session.commit()

    return {
        "org_id": org_id,
        "clinic_a_id": clinic_a_id,
        "clinic_b_id": clinic_b_id,
        "doc_tariq_id": doc_tariq_id,
        "doc_sara_id": doc_sara_id,
        "doc_off_id": doc_off_id,
        "s1_id": s1_id,
        "s2_id": s2_id,
        "s3_id": s3_id,
        "s4_id": s4_id,
        "s5_id": s5_id,
        "flow_settings": flow_settings,
    }


@pytest.mark.asyncio
async def test_lead_capture_dedupe_by_phone(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Submitting contact step with the same phone deduplicates into the existing open lead,
    updates lead contact fields, records events, and returns a fresh distinct token.
    Both the old and new tokens remain valid for their sessions.
    """
    payload_1 = {
        "fullName": "Zainab Abbasi",
        "phone": "0300 1234567",
        "email": "zainab.initial@example.com",
        "noticeVersion": "v1.0",
    }
    r1 = await client_with_db.post("/api/v1/public/leads", json=payload_1)
    assert r1.status_code == 201
    token_1 = r1.json()["captureToken"]
    assert token_1 and len(token_1) >= 32

    # Second submission with different name formatting and international prefix (+92 300 1234567)
    payload_2 = {
        "fullName": "Zainab A. Abbasi",
        "phone": "+92 300 1234567",
        "email": "zainab.updated@example.com",
        "noticeVersion": "v1.1",
    }
    r2 = await client_with_db.post("/api/v1/public/leads", json=payload_2)
    assert r2.status_code == 201
    token_2 = r2.json()["captureToken"]
    # Token reuse replaced with a fresh token for every capture call
    assert token_1 != token_2

    # Assert old token STILL works for its own session
    r_patch1 = await client_with_db.patch(f"/api/v1/public/leads/{token_1}", json={"notes": "Session 1 update"})
    assert r_patch1.status_code == 200

    # Assert new token ALSO works for its own session
    r_patch2 = await client_with_db.patch(f"/api/v1/public/leads/{token_2}", json={"notes": "Session 2 update"})
    assert r_patch2.status_code == 200

    # Assert exactly ONE lead exists in database
    res = await test_session.execute(select(LeadORM).where(LeadORM.phone_normalized == "923001234567"))
    leads = res.scalars().all()
    assert len(leads) == 1
    lead = leads[0]
    assert lead.full_name == "Zainab A. Abbasi"
    assert lead.email == "zainab.updated@example.com"
    assert lead.notes == "Session 2 update"
    assert lead.consent_notice_version == "v1.1"
    assert lead.status == LeadStatus.UNCONVERTED.value

    # Check lead_events audit log
    ev_res = await test_session.execute(
        select(LeadEventORM).where(LeadEventORM.lead_id == lead.id).order_by(LeadEventORM.created_at.asc())
    )
    events = ev_res.scalars().all()
    assert len(events) >= 2
    assert events[0].actor_type == "system"
    assert events[0].payload.get("is_update") is False
    assert events[1].payload.get("is_update") is True


@pytest.mark.asyncio
async def test_token_cannot_overwrite_existing_name_or_email(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    PATCH by token may set service, clinic, doctor, and notes,
    and may fill name, email or phone only if they are currently empty (never overwrite).
    """
    # 1. Create lead with full_name and email
    init_res = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Fatima Zahra", "phone": "0333 5554433", "email": "fatima.initial@example.com"},
    )
    assert init_res.status_code == 201
    tok = init_res.json()["captureToken"]

    # 2. Attempt to overwrite fullName, email, and phone with PATCH
    patch_res = await client_with_db.patch(
        f"/api/v1/public/leads/{tok}",
        json={
            "fullName": "Malicious Overwriter",
            "email": "hacker@example.com",
            "phone": "0300 0000000",
            "notes": "Legitimate symptoms note",
            "serviceId": "cleanings-exams",
        },
    )
    assert patch_res.status_code == 200

    res = await test_session.execute(select(LeadORM).where(LeadORM.phone_normalized == "923335554433"))
    lead = res.scalars().one()
    # Name, email, and phone were NOT overwritten
    assert lead.full_name == "Fatima Zahra"
    assert lead.email == "fatima.initial@example.com"
    assert lead.phone_normalized == "923335554433"
    # Service and notes WERE successfully updated
    assert lead.service_id == "cleanings-exams"
    assert lead.notes == "Legitimate symptoms note"

    # 3. If a field was empty (e.g. no email initially), verify it CAN be filled
    init_res2 = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Usman Tariq", "phone": "0345 9998877"},
    )
    assert init_res2.status_code == 201
    tok2 = init_res2.json()["captureToken"]

    patch_fill = await client_with_db.patch(
        f"/api/v1/public/leads/{tok2}",
        json={"email": "usman.filled@example.com"},
    )
    assert patch_fill.status_code == 200

    res2 = await test_session.execute(select(LeadORM).where(LeadORM.phone_normalized == "923459998877"))
    lead2 = res2.scalars().one()
    assert lead2.email == "usman.filled@example.com"


@pytest.mark.asyncio
async def test_expired_token_returns_404(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    A capture token past its 24-hour expiration window returns 404 on PATCH.
    """
    capture_res = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Bilal Ahmed", "phone": "0321 7776655"},
    )
    assert capture_res.status_code == 201
    token = capture_res.json()["captureToken"]

    # Expire all tokens for this lead in the database
    res = await test_session.execute(select(LeadORM).where(LeadORM.phone_normalized == "923217776655"))
    lead = res.scalars().one()
    token_records = (await test_session.execute(select(LeadCaptureTokenORM).where(LeadCaptureTokenORM.lead_id == lead.id))).scalars().all()
    for tr in token_records:
        tr.expires_at = datetime.now(timezone.utc) - timedelta(hours=2)
    lead.updated_at = datetime.now(timezone.utc) - timedelta(hours=48)
    lead.created_at = datetime.now(timezone.utc) - timedelta(hours=48)
    await test_session.commit()

    # PATCH with expired token returns 404
    patch_res = await client_with_db.patch(
        f"/api/v1/public/leads/{token}",
        json={"notes": "Should not work on expired token"},
    )
    assert patch_res.status_code == 404
    assert "expired" in patch_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_concurrent_lead_captures_race_condition():
    """
    Two capture requests executed concurrently across separate database sessions for the same normalized phone
    are safely guarded by DB locking / partial unique index; both succeed and yield exactly one unconverted lead.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as init_session:
        init_session.add(
            BookingFlowSettingsORM(
                organization_id=UUID("00000000-0000-0000-0000-000000000001"),
                lead_capture_notice="We save your details to help you finish booking.",
            )
        )
        await init_session.commit()

    async def get_test_db():
        async with session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = get_test_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            shared_phone = "0312 9876543"
            payload_a = {"fullName": "Concurrent User A", "phone": shared_phone, "email": "a@example.com"}
            payload_b = {"fullName": "Concurrent User B", "phone": shared_phone, "email": "b@example.com"}

            res_a, res_b = await asyncio.gather(
                client.post("/api/v1/public/leads", json=payload_a),
                client.post("/api/v1/public/leads", json=payload_b),
            )

            assert res_a.status_code == 201
            assert res_b.status_code == 201
            tok_a = res_a.json()["captureToken"]
            tok_b = res_b.json()["captureToken"]
            assert tok_a != tok_b

            async with session_maker() as check_session:
                res = await check_session.execute(select(LeadORM).where(LeadORM.phone_normalized == "923129876543"))
                leads = res.scalars().all()
                assert len(leads) == 1

            # Both tokens work independently
            patch_a = await client.patch(f"/api/v1/public/leads/{tok_a}", json={"notes": "From Session A"})
            assert patch_a.status_code == 200

            patch_b = await client.patch(f"/api/v1/public/leads/{tok_b}", json={"notes": "From Session B"})
            assert patch_b.status_code == 200
    finally:
        app.dependency_overrides.pop(get_db_session, None)
        await engine.dispose()


@pytest.mark.asyncio
async def test_lead_capture_honeypot_trap(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Spam submissions with filled honeypot fields return a synthetic token immediately
    without persisting any lead to the database.
    """
    bot_payload = {
        "fullName": "Bot Spammer",
        "phone": "0321 9999999",
        "email": "spammer@botnet.org",
        "hp": "http://spamsite.com/payload",
    }
    resp = await client_with_db.post("/api/v1/public/leads", json=bot_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "captureToken" in data

    # Verify database contains no lead for this phone
    res = await test_session.execute(select(LeadORM).where(LeadORM.phone_normalized == "923219999999"))
    assert res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_no_existence_disclosure(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Lead capture response never reveals whether a phone belongs to an existing patient
    or previously converted lead. Response contains strictly captureToken.
    """
    existing_phone = "0333 4445555"
    norm_phone = "923334445555"

    # Pre-seed existing Patient and Converted Lead
    patient = PatientORM(
        first_name="Hassan",
        last_name="Raza",
        phone=existing_phone,
        phone_normalized=norm_phone,
        email="hassan@example.com",
    )
    test_session.add(patient)
    await test_session.flush()

    converted_lead = LeadORM(
        full_name="Hassan Raza",
        phone=existing_phone,
        phone_normalized=norm_phone,
        status=LeadStatus.CONVERTED.value,
        patient_id=patient.id,
    )
    test_session.add(converted_lead)
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Someone Else", "phone": existing_phone},
    )
    assert resp.status_code == 201
    data = resp.json()

    # Strictly captureToken only
    assert list(data.keys()) == ["captureToken"]
    # No PHI, no patient details or status leaked
    assert "Hassan" not in resp.text
    assert "converted" not in resp.text
    assert "patient" not in resp.text


@pytest.mark.asyncio
async def test_token_cannot_update_other_leads(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    PATCH /api/v1/public/leads/{token} updates strictly the lead owning the token
    and rejects invalid or cross-lead tokens.
    """
    lead_a = LeadORM(
        full_name="Lead Alpha",
        phone="0301 1111111",
        phone_normalized="923011111111",
        capture_token="token_alpha_12345678901234567890",
        status=LeadStatus.UNCONVERTED.value,
    )
    lead_b = LeadORM(
        full_name="Lead Beta",
        phone="0302 2222222",
        phone_normalized="923022222222",
        capture_token="token_beta_123456789012345678901",
        status=LeadStatus.UNCONVERTED.value,
        notes="Original Lead B notes",
    )
    test_session.add_all([lead_a, lead_b])
    await test_session.commit()

    # 1. Update Lead Alpha using token_a
    r_patch = await client_with_db.patch(
        f"/api/v1/public/leads/{lead_a.capture_token}",
        json={"serviceId": "cleanings-exams", "notes": "Sensitive tooth on lower right"},
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["success"] is True

    # 2. Attempt update with nonexistent token
    r_bad = await client_with_db.patch(
        "/api/v1/public/leads/completely_fake_token_value",
        json={"notes": "Should fail"},
    )
    assert r_bad.status_code == 404

    # 3. Verify Lead B was NOT altered
    await test_session.refresh(lead_a)
    await test_session.refresh(lead_b)
    assert lead_a.service_id == "cleanings-exams"
    assert lead_a.notes == "Sensitive tooth on lower right"
    assert lead_b.notes == "Original Lead B notes"
    assert lead_b.service_id is None


@pytest.mark.asyncio
async def test_eligibility_and_bookability_filters(
    client_with_db: AsyncClient,
    test_session: AsyncSession,
    seed_booking_env: dict,
):
    """
    Tests unified eligibility filtering:
    - Service S1 (Cleanings): offered at Clinic A & B, eligible doctors with slots -> BOOKABLE
    - Service S2 (Root canals): offered at Clinic A, empty provider set -> all active doctors -> BOOKABLE
    - Service S3 (Invisalign): offered at Clinic B, but doctor is at Clinic A -> NO_ELIGIBLE_DOCTOR
    - Service S4 (Emergency): offered at Clinic A, doctor has no shifts -> NO_SLOTS_IN_HORIZON
    - Service S5 (Whitening): inactive -> excluded
    """
    env = seed_booking_env

    # 1. Public bookable services endpoint
    resp = await client_with_db.get("/api/v1/public/booking/services")
    assert resp.status_code == 200
    services = resp.json()
    slugs = [s["slug"] for s in services]

    assert "cleanings-exams" in slugs
    assert "root-canals" in slugs
    assert "invisalign" not in slugs  # Filtered: clinic without eligible doctor
    assert "emergency" not in slugs   # Filtered: doctor without slots
    assert "whitening" not in slugs   # Filtered: inactive service

    # 2. Public bookable clinics for cleanings-exams (S1)
    r_clinics = await client_with_db.get("/api/v1/public/booking/clinics?serviceId=cleanings-exams")
    assert r_clinics.status_code == 200
    clinics = r_clinics.json()
    clinic_ids = [c["id"] for c in clinics]
    assert str(env["clinic_a_id"]) in clinic_ids

    # 3. Public bookable clinics for invisalign (S3) -> empty list
    r_c3 = await client_with_db.get("/api/v1/public/booking/clinics?serviceId=invisalign")
    assert r_c3.status_code == 200
    assert r_c3.json() == []

    # 4. Public bookable doctors for S1 at Clinic A
    r_docs = await client_with_db.get(
        f"/api/v1/public/booking/doctors?serviceId=cleanings-exams&clinicId={env['clinic_a_id']}&days=7"
    )
    assert r_docs.status_code == 200
    doctors = r_docs.json()
    doc_ids = [d["id"] for d in doctors]
    assert str(env["doc_tariq_id"]) in doc_ids
    # Verify slotsByDate is present with available slots
    doc_tariq = next(d for d in doctors if d["id"] == str(env["doc_tariq_id"]))
    assert "slotsByDate" in doc_tariq
    assert len(doc_tariq["slotsByDate"]) == 7
    assert doc_tariq["weeklyScheduleSummary"] is not None


@pytest.mark.asyncio
async def test_patients_treated_count_and_privacy_switches(
    client_with_db: AsyncClient,
    test_session: AsyncSession,
    seed_booking_env: dict,
):
    """
    Tests patientsTreated count calculation:
    - Counts distinct patients with completed visits
    - Hidden (None) when switched off per doctor or globally
    """
    env = seed_booking_env
    doc_id = env["doc_tariq_id"]

    # Seed 3 completed bookings for distinct patients
    for i in range(3):
        pat = PatientORM(
            first_name=f"Patient{i}",
            last_name="Completed",
            phone=f"0300999000{i}",
            phone_normalized=f"92300999000{i}",
        )
        test_session.add(pat)
        await test_session.flush()

        bk = BookingORM(
            confirmation_id=f"MD-2026-900{i}",
            preferred_date=date.today() - timedelta(days=i + 1),
            preferred_time="10:00 AM",
            patient_full_name=f"Patient{i} Completed",
            patient_phone=f"0300999000{i}",
            patient_id=pat.id,
            team_member_id=doc_id,
            status="completed",
        )
        test_session.add(bk)

    # Add 1 cancelled booking (should NOT be counted)
    test_session.add(
        BookingORM(
            confirmation_id="MD-2026-8888",
            preferred_date=date.today() - timedelta(days=5),
            preferred_time="11:00 AM",
            patient_full_name="Cancelled Patient",
            patient_phone="03009990009",
            team_member_id=doc_id,
            status="cancelled",
        )
    )
    await test_session.commit()

    # 1. Default: global=True, doc=True -> patientsTreated == 3
    r1 = await client_with_db.get(
        f"/api/v1/public/booking/doctors?serviceId=cleanings-exams&clinicId={env['clinic_a_id']}"
    )
    assert r1.status_code == 200
    doc_card = next(d for d in r1.json() if d["id"] == str(doc_id))
    assert doc_card["patientsTreated"] == 3

    # 2. Toggle doctor switch OFF (show_patients_treated = False)
    doc_orm = await test_session.get(TeamMemberORM, doc_id)
    doc_orm.show_patients_treated = False
    await test_session.commit()

    r2 = await client_with_db.get(
        f"/api/v1/public/booking/doctors?serviceId=cleanings-exams&clinicId={env['clinic_a_id']}"
    )
    doc_card_2 = next(d for d in r2.json() if d["id"] == str(doc_id))
    assert doc_card_2["patientsTreated"] is None

    # 3. Toggle doctor switch back ON, but turn global switch OFF
    doc_orm.show_patients_treated = True
    stmt = select(BookingFlowSettingsORM)
    flow_res = await test_session.execute(stmt)
    fs = flow_res.scalars().first()
    fs.show_patients_treated = False
    await test_session.commit()

    r3 = await client_with_db.get(
        f"/api/v1/public/booking/doctors?serviceId=cleanings-exams&clinicId={env['clinic_a_id']}"
    )
    doc_card_3 = next(d for d in r3.json() if d["id"] == str(doc_id))
    assert doc_card_3["patientsTreated"] is None


@pytest.mark.asyncio
async def test_slot_collision_race_condition(
    client_with_db: AsyncClient,
    test_session: AsyncSession,
    seed_booking_env: dict,
):
    """
    Under slot locking, two submissions for the exact same slot result in one winning (201)
    and the second receiving a 409 conflict ("double-booking conflict").
    """
    env = seed_booking_env
    # Choose next working day (e.g. tomorrow or Monday if weekend)
    target_dt = date.today() + timedelta(days=1)
    if target_dt.weekday() >= 5:  # weekend
        target_dt = target_dt + timedelta(days=7 - target_dt.weekday())

    payload_base = {
        "serviceId": "cleanings-exams",
        "preferredDate": target_dt.isoformat(),
        "preferredTime": "10:00 AM",
        "clinicId": str(env["clinic_a_id"]),
        "teamMemberId": str(env["doc_tariq_id"]),
        "bookingFor": "myself",
    }

    # Submit 1st appointment
    req1 = {**payload_base, "fullName": "Patient First", "phone": "0300 5551111"}
    r1 = await client_with_db.post("/api/v1/appointments", json=req1)
    assert r1.status_code == 201
    assert r1.json()["success"] is True

    # Submit 2nd appointment for same slot
    req2 = {**payload_base, "fullName": "Patient Second", "phone": "0300 5552222"}
    r2 = await client_with_db.post("/api/v1/appointments", json=req2)
    assert r2.status_code == 409
    assert "Double-booking conflict" in r2.json()["detail"]


@pytest.mark.asyncio
async def test_paused_booking_mode_and_closures(
    client_with_db: AsyncClient,
    test_session: AsyncSession,
    seed_booking_env: dict,
):
    """
    Validates that:
    1. Paused booking mode blocks submissions with 423 Locked.
    2. Planned clinic closures block appointments with 422 Unprocessable Entity.
    """
    env = seed_booking_env
    target_dt = date.today() + timedelta(days=2)
    if target_dt.weekday() >= 5:
        target_dt = target_dt + timedelta(days=7 - target_dt.weekday())

    # 1. Add planned calendar closure for target_dt
    closure = ClinicClosureORM(
        start_date=target_dt,
        end_date=target_dt,
        reason="Eid ul Fitr Public Holiday",
        message="Clinic closed for Eid celebrations",
    )
    test_session.add(closure)
    await test_session.commit()

    payload = {
        "serviceId": "cleanings-exams",
        "preferredDate": target_dt.isoformat(),
        "preferredTime": "11:00 AM",
        "fullName": "Holiday Patient",
        "phone": "0300 7778888",
        "clinicId": str(env["clinic_a_id"]),
    }

    # Should be blocked by closure
    r_closure = await client_with_db.post("/api/v1/appointments", json=payload)
    assert r_closure.status_code == 422
    assert "Eid ul Fitr" in r_closure.json()["detail"]

    # 2. Test Emergency Paused booking mode on another open day
    other_dt = date.today() + timedelta(days=4)
    if other_dt.weekday() >= 5:
        other_dt = other_dt + timedelta(days=7 - other_dt.weekday())

    # Set booking settings to paused
    stmt = select(ClinicBookingSettingsORM)
    b_res = await test_session.execute(stmt)
    bs = b_res.scalars().first()
    bs.booking_mode = "paused"
    bs.pause_message = "Online booking paused due to technical maintenance."
    await test_session.commit()

    payload_paused = {**payload, "preferredDate": other_dt.isoformat()}
    r_paused = await client_with_db.post("/api/v1/appointments", json=payload_paused)
    assert r_paused.status_code == 423
    assert "Online booking paused" in r_paused.json()["detail"]


@pytest.mark.asyncio
async def test_booking_marks_lead_converted(
    client_with_db: AsyncClient,
    test_session: AsyncSession,
    seed_booking_env: dict,
):
    """
    Completing appointment submission with leadToken:
    - Marks lead status as converted
    - Sets bookings.lead_id and source='website'
    - Writes event to lead_events with actor system
    """
    env = seed_booking_env

    # 1. Step 1: Capture lead
    r_lead = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Fatima Noor", "phone": "0322 8889900", "email": "fatima@example.com"},
    )
    assert r_lead.status_code == 201
    lead_token = r_lead.json()["captureToken"]

    # 2. Choose target date and free slot dynamically from availability
    r_docs = await client_with_db.get(
        f"/api/v1/public/booking/doctors?serviceId=cleanings-exams&clinicId={env['clinic_a_id']}&days=7"
    )
    assert r_docs.status_code == 200
    doc_tariq = next(d for d in r_docs.json() if d["id"] == str(env["doc_tariq_id"]))

    chosen_date = None
    chosen_slot = None
    for d_str, slots in doc_tariq.get("slotsByDate", {}).items():
        if slots:
            chosen_date = d_str
            chosen_slot = slots[0]
            break

    assert chosen_date is not None and chosen_slot is not None, "No available slot for doc_tariq"

    # 3. Step 6: Submit final booking
    booking_req = {
        "serviceId": "cleanings-exams",
        "preferredDate": chosen_date,
        "preferredTime": chosen_slot,
        "fullName": "Fatima Noor",
        "phone": "0322 8889900",
        "email": "fatima@example.com",
        "clinicId": str(env["clinic_a_id"]),
        "teamMemberId": str(env["doc_tariq_id"]),
        "leadToken": lead_token,
        "bookingFor": "myself",
        "notes": "Mild bleeding during flossing",
    }
    r_book = await client_with_db.post("/api/v1/appointments", json=booking_req)
    assert r_book.status_code == 201
    conf_id = r_book.json()["confirmationId"]

    # 4. Verify Lead was marked converted
    res = await test_session.execute(select(LeadORM).where(LeadORM.capture_token == lead_token))
    lead = res.scalar_one()
    assert lead.status == LeadStatus.CONVERTED.value
    assert lead.patient_id is not None

    # 5. Verify Booking record attributes
    b_res = await test_session.execute(select(BookingORM).where(BookingORM.confirmation_id == conf_id))
    booking = b_res.scalar_one()
    assert booking.lead_id == lead.id
    assert booking.source == "website"
    assert booking.status == "confirmed"  # auto_confirm_online is True in seeded settings
    assert booking.clinic_id == env["clinic_a_id"]
    assert booking.team_member_id == env["doc_tariq_id"]

    # 6. Verify lead_events written
    ev_res = await test_session.execute(
        select(LeadEventORM).where(
            LeadEventORM.lead_id == lead.id,
            LeadEventORM.event_type == "converted",
        )
    )
    converted_event = ev_res.scalar_one()
    assert converted_event.actor_type == "system"
    assert converted_event.payload.get("confirmation_id") == conf_id


@pytest.mark.asyncio
async def test_eligibility_service_unit_rules(
    test_session: AsyncSession,
    seed_booking_env: dict,
):
    """
    Direct unit tests for BookingEligibilityService.check_service_bookability:
    1. Inactive service -> returns SERVICE_INACTIVE
    2. Active service without clinic -> returns NO_ACTIVE_CLINIC
    3. Active service with clinic but without doctor -> returns NO_ELIGIBLE_DOCTOR
    4. Active service with doctor without slots -> returns NO_SLOTS_IN_HORIZON
    5. Active service with empty provider set -> all active doctors at clinic perform it -> eligible
    """
    from app.infrastructure.repositories.postgres_clinic_service_repo import PostgresClinicServiceRepository
    from app.infrastructure.repositories.postgres_booking_flow_settings_repo import PostgresBookingFlowSettingsRepository
    from app.infrastructure.repositories.postgres_booking_settings_repo import PostgresBookingSettingsRepository
    from app.application.services.availability_service import AvailabilityService

    env = seed_booking_env
    clinic_service_repo = PostgresClinicServiceRepository(test_session)
    booking_flow_repo = PostgresBookingFlowSettingsRepository(test_session)
    booking_settings_repo = PostgresBookingSettingsRepository(test_session)
    avail_service = AvailabilityService(booking_settings_repo=booking_settings_repo, session=test_session)

    eligibility_service = BookingEligibilityService(
        session=test_session,
        clinic_service_repo=clinic_service_repo,
        booking_flow_settings_repo=booking_flow_repo,
        booking_settings_repo=booking_settings_repo,
        availability_service=avail_service,
    )

    # 1. Inactive service (S5 whitening)
    eval_s5 = await eligibility_service.check_service_bookability(env["s5_id"])
    assert eval_s5.is_eligible is False
    assert "SERVICE_INACTIVE" in eval_s5.reasons

    # 2. Service without clinic
    unlinked_svc = ServiceORM(
        id=uuid4(),
        slug="unlinked-service",
        category="General",
        title="Unlinked Service",
        short_desc="Unlinked description",
        cash_price="100.00",
        duration="30m",
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(unlinked_svc)
    await test_session.commit()

    eval_unlinked = await eligibility_service.check_service_bookability(unlinked_svc.id)
    assert eval_unlinked.is_eligible is False
    assert "NO_ACTIVE_CLINIC" in eval_unlinked.reasons

    # 3. Clinic without doctor (S3 invisalign at Clinic B)
    eval_s3 = await eligibility_service.check_service_bookability(env["s3_id"], clinic_id=env["clinic_b_id"])
    assert eval_s3.is_eligible is False
    assert "NO_ELIGIBLE_DOCTOR" in eval_s3.reasons

    # 4. Doctor without slots (S4 emergency at Clinic A - Dr. Off has no open shifts)
    eval_s4 = await eligibility_service.check_service_bookability(env["s4_id"], clinic_id=env["clinic_a_id"])
    assert eval_s4.is_eligible is False
    assert "NO_SLOTS_IN_HORIZON" in eval_s4.reasons

    # 5. Empty provider set (S2 root-canals at Clinic A) -> all active doctors can perform it
    eval_s2 = await eligibility_service.check_service_bookability(env["s2_id"], clinic_id=env["clinic_a_id"])
    assert eval_s2.is_eligible is True
    assert eval_s2.status == "eligible"
    assert len(eval_s2.reasons) == 0
    assert len(eval_s2.eligible_doctors) > 0
