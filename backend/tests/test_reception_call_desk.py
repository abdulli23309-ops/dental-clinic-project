from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select

from app.application.services.call_desk_service import can_send_message, is_held
from app.domain.models.booking_crm import Patient
from app.domain.models.phone_utils import normalize_pakistan_phone
from app.infrastructure.database.orm_models import (
    ActivityLogORM,
    CallLogORM,
    ContactHoldORM,
    LeadEventORM,
    LeadORM,
    PatientORM,
)


@pytest.mark.asyncio
async def test_lookup_patient_only(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    raw_phone = "03001112233"
    norm = normalize_pakistan_phone(raw_phone)

    pat = PatientORM(
        first_name="Zubair",
        last_name="Khan",
        phone=raw_phone,
        phone_normalized=norm,
        email="zubair@example.com",
    )
    test_session.add(pat)
    await test_session.commit()

    res = await client.get(f"/api/v1/reception/call-desk/lookup?phone={raw_phone}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["phoneNormalized"] == norm
    assert len(data["patients"]) == 1
    assert data["patients"][0]["fullName"] == "Zubair Khan"
    assert len(data["leads"]) == 0
    assert data["activeHold"] is None


@pytest.mark.asyncio
async def test_lookup_lead_only(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    raw_phone = "03002223344"
    norm = normalize_pakistan_phone(raw_phone)

    lead = LeadORM(
        full_name="Amina Bibi",
        phone=raw_phone,
        phone_normalized=norm,
        email="amina@example.com",
        status="unconverted",
        utm_source="website_abandon",
        attempts=2,
    )
    test_session.add(lead)
    await test_session.flush()

    ev = LeadEventORM(
        lead_id=lead.id,
        event_type="followup_attempt",
        actor_type="system",
        payload={"channel": "whatsapp", "attempt": 1},
    )
    test_session.add(ev)
    await test_session.commit()

    res = await client.get(f"/api/v1/reception/call-desk/lookup?phone={raw_phone}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["patients"]) == 0
    assert len(data["leads"]) == 1
    assert data["leads"][0]["fullName"] == "Amina Bibi"
    assert data["leads"][0]["status"] == "unconverted"
    assert data["leads"][0]["attempts"] == 2
    assert len(data["leads"][0]["events"]) >= 1


@pytest.mark.asyncio
async def test_lookup_both_patient_and_lead(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    raw_phone = "03003334455"
    norm = normalize_pakistan_phone(raw_phone)

    pat = PatientORM(
        first_name="Bilal",
        last_name="Ahmed",
        phone=raw_phone,
        phone_normalized=norm,
    )
    lead = LeadORM(
        full_name="Bilal Ahmed",
        phone=raw_phone,
        phone_normalized=norm,
        status="unconverted",
        utm_source="phone_missed_call",
    )
    test_session.add_all([pat, lead])
    await test_session.commit()

    res = await client.get(f"/api/v1/reception/call-desk/lookup?phone={raw_phone}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["patients"]) == 1
    assert len(data["leads"]) == 1


@pytest.mark.asyncio
async def test_lookup_none(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    raw_phone = "03009998877"
    norm = normalize_pakistan_phone(raw_phone)

    res = await client.get(f"/api/v1/reception/call-desk/lookup?phone={raw_phone}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["phoneNormalized"] == norm
    assert len(data["patients"]) == 0
    assert len(data["leads"]) == 0
    assert len(data["upcomingBookings"]) == 0
    assert len(data["recentMessages"]) == 0
    assert data["activeHold"] is None


@pytest.mark.asyncio
async def test_lookup_family_members(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    shared_phone = "03004445566"
    norm = normalize_pakistan_phone(shared_phone)

    parent = PatientORM(
        first_name="Rashid",
        last_name="Minhas",
        phone=shared_phone,
        phone_normalized=norm,
    )
    child = PatientORM(
        first_name="Farhan",
        last_name="Minhas",
        phone=shared_phone,
        phone_normalized=norm,
    )
    test_session.add_all([parent, child])
    await test_session.commit()

    res = await client.get(f"/api/v1/reception/call-desk/lookup?phone={shared_phone}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["patients"]) == 2
    names = {p["fullName"] for p in data["patients"]}
    assert "Rashid Minhas" in names
    assert "Farhan Minhas" in names


@pytest.mark.asyncio
async def test_hold_start_extend_release(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    phone = "03005556677"
    norm = normalize_pakistan_phone(phone)

    # 1. Start hold
    start_res = await client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": phone, "holdMinutes": 20, "reason": "call_desk"},
        headers=headers,
    )
    assert start_res.status_code == 200
    h1 = start_res.json()
    assert h1["isActive"] is True
    assert h1["phoneNormalized"] == norm
    assert h1["remainingSeconds"] > 0

    # Verify is_held returns True
    assert await is_held(phone, session=test_session) is True

    # 2. Extend hold
    extend_res = await client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": phone, "holdMinutes": 50, "reason": "extended_call"},
        headers=headers,
    )
    assert extend_res.status_code == 200
    h2 = extend_res.json()
    assert h2["isActive"] is True
    assert h2["remainingSeconds"] > h1["remainingSeconds"]

    # 3. Release hold
    rel_res = await client.delete(
        f"/api/v1/reception/call-desk/holds?phone={phone}",
        headers=headers,
    )
    assert rel_res.status_code == 200
    assert rel_res.json()["released"] is True

    # Verify is_held returns False
    assert await is_held(phone, session=test_session) is False

    # Verify lookup shows activeHold as None
    lookup_res = await client.get(f"/api/v1/reception/call-desk/lookup?phone={phone}", headers=headers)
    assert lookup_res.json()["activeHold"] is None


@pytest.mark.asyncio
async def test_hold_auto_expiry(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    phone = "03006667788"
    norm = normalize_pakistan_phone(phone)
    now = datetime.now(timezone.utc)

    # Insert expired hold directly
    expired_hold = ContactHoldORM(
        phone_normalized=norm,
        held_until=now - timedelta(minutes=5),
        reason="call_desk",
        released_at=None,
    )
    test_session.add(expired_hold)
    await test_session.commit()

    # Expired hold should not be active
    assert await is_held(phone, session=test_session) is False

    lookup_res = await client.get(f"/api/v1/reception/call-desk/lookup?phone={phone}", headers=headers)
    assert lookup_res.json()["activeHold"] is None


@pytest.mark.asyncio
async def test_dropped_call_with_details(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    phone = "03007778899"
    norm = normalize_pakistan_phone(phone)

    # Start hold first
    await client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": phone, "holdMinutes": 30},
        headers=headers,
    )
    assert await is_held(phone, session=test_session) is True

    # Drop call with contact details collected
    outcome_res = await client.post(
        "/api/v1/reception/call-desk/outcomes",
        json={
            "phone": phone,
            "outcome": "dropped",
            "notes": "Patient got cut off while discussing root canal",
            "leadCapture": {
                "name": "Hamza Tariq",
                "email": "hamza@example.com",
            },
        },
        headers=headers,
    )
    assert outcome_res.status_code == 200
    out = outcome_res.json()
    assert out["leadCaptured"] is True
    assert out["capturedLeadId"] is not None
    assert out["holdReleased"] is True

    # Verify hold is released
    assert await is_held(phone, session=test_session) is False

    # Verify unconverted lead created with source call_desk
    lead_stmt = select(LeadORM).where(LeadORM.id == UUID(str(out["capturedLeadId"])))
    l_res = await test_session.execute(lead_stmt)
    lead = l_res.scalar_one()
    assert lead.status == "unconverted"
    assert lead.utm_source == "call_desk"
    assert lead.full_name == "Hamza Tariq"

    # Verify lead_events record
    ev_stmt = select(LeadEventORM).where(LeadEventORM.lead_id == lead.id)
    ev_res = await test_session.execute(ev_stmt)
    events = ev_res.scalars().all()
    assert any(e.event_type == "call_dropped_captured" for e in events)

    # Verify call_logs entry
    cl_stmt = select(CallLogORM).where(CallLogORM.phone_normalized == norm)
    cl_res = await test_session.execute(cl_stmt)
    logs = cl_res.scalars().all()
    assert any(l.outcome == "dropped" for l in logs)


@pytest.mark.asyncio
async def test_dropped_call_without_details(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    phone = "03008889900"
    norm = normalize_pakistan_phone(phone)

    # Start hold
    await client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": phone, "holdMinutes": 30},
        headers=headers,
    )

    # Drop call with NO details collected
    outcome_res = await client.post(
        "/api/v1/reception/call-desk/outcomes",
        json={
            "phone": phone,
            "outcome": "dropped",
            "notes": "Caller disconnected after greeting before providing name",
        },
        headers=headers,
    )
    assert outcome_res.status_code == 200
    out = outcome_res.json()
    assert out["leadCaptured"] is False
    assert out["capturedLeadId"] is None
    assert out["holdReleased"] is True

    # Verify NO lead was created
    lead_stmt = select(LeadORM).where(LeadORM.phone_normalized == norm)
    l_res = await test_session.execute(lead_stmt)
    assert l_res.scalar_one_or_none() is None

    # But call_log is recorded
    cl_stmt = select(CallLogORM).where(CallLogORM.phone_normalized == norm)
    cl_res = await test_session.execute(cl_stmt)
    logs = cl_res.scalars().all()
    assert len(logs) == 1
    assert logs[0].outcome == "dropped"


@pytest.mark.asyncio
async def test_outcome_rules_validation(receptionist_auth):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    # Valid outcomes
    for valid_outcome in ["booked", "callback_requested", "dropped", "wrong_number", "not_interested", "info_only"]:
        res = await client.post(
            "/api/v1/reception/call-desk/outcomes",
            json={
                "phone": "03009991122",
                "outcome": valid_outcome,
                "notes": f"Testing {valid_outcome}",
            },
            headers=headers,
        )
        assert res.status_code == 200, f"Outcome {valid_outcome} should be accepted"

    # Invalid outcome rejected with 422
    bad_res = await client.post(
        "/api/v1/reception/call-desk/outcomes",
        json={
            "phone": "03009991122",
            "outcome": "random_unsupported_outcome",
        },
        headers=headers,
    )
    assert bad_res.status_code == 422


@pytest.mark.asyncio
async def test_booking_converts_lead_and_records_source_call_desk(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    caller_phone = "03001239876"
    norm = normalize_pakistan_phone(caller_phone)

    # 1. Open unconverted lead exists for this caller
    lead = LeadORM(
        full_name="Tariq Jamil",
        phone=caller_phone,
        phone_normalized=norm,
        email="tariq@example.com",
        status="unconverted",
        utm_source="website_abandon",
    )
    test_session.add(lead)
    await test_session.commit()

    # 2. Receptionist creates booking with source="call_desk"
    today = date.today()
    booking_res = await client.post(
        "/api/v1/reception/appointments",
        json={
            "patientFullName": "Tariq Jamil",
            "patientPhone": caller_phone,
            "patientEmail": "tariq@example.com",
            "preferredDate": today.isoformat(),
            "preferredTime": "11:00 AM",
            "source": "call_desk",
            "notes": "Booked during reception desk call",
        },
        headers=headers,
    )
    assert booking_res.status_code == 201
    b_data = booking_res.json()
    assert b_data["source"] == "call_desk"

    # 3. Verify lead is converted
    await test_session.refresh(lead)
    assert lead.status == "converted"
    assert lead.patient_id is not None

    # 4. Verify lead_events record
    ev_stmt = select(LeadEventORM).where(LeadEventORM.lead_id == lead.id)
    ev_res = await test_session.execute(ev_stmt)
    events = ev_res.scalars().all()
    assert any(e.event_type == "lead_converted" for e in events)


@pytest.mark.asyncio
async def test_wrong_role_gets_403(doctor_auth):
    # Doctor auth should get 403 on reception call desk endpoints
    doc_client = doctor_auth["client"]
    doc_headers = doctor_auth["headers"]

    r1 = await doc_client.get("/api/v1/reception/call-desk/lookup?phone=03001112233", headers=doc_headers)
    assert r1.status_code == 403

    r2 = await doc_client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": "03001112233", "holdMinutes": 30},
        headers=doc_headers,
    )
    assert r2.status_code == 403

    r3 = await doc_client.delete("/api/v1/reception/call-desk/holds?phone=03001112233", headers=doc_headers)
    assert r3.status_code == 403

    r4 = await doc_client.post(
        "/api/v1/reception/call-desk/outcomes",
        json={"phone": "03001112233", "outcome": "info_only"},
        headers=doc_headers,
    )
    assert r4.status_code == 403


@pytest.mark.asyncio
async def test_audit_entries(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    audit_phone = "03007654321"

    # 1. Lookup
    await client.get(f"/api/v1/reception/call-desk/lookup?phone={audit_phone}", headers=headers)

    # 2. Hold
    await client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": audit_phone, "holdMinutes": 15},
        headers=headers,
    )

    # 3. Outcome
    await client.post(
        "/api/v1/reception/call-desk/outcomes",
        json={"phone": audit_phone, "outcome": "info_only", "notes": "Caller asked about clinic hours"},
        headers=headers,
    )

    # Verify activity logs
    stmt = select(ActivityLogORM).order_by(ActivityLogORM.created_at.desc()).limit(20)
    res = await test_session.execute(stmt)
    logs = res.scalars().all()
    actions = [l.action for l in logs]
    assert "call_desk_lookup" in actions
    assert "call_desk_hold_start" in actions
    assert "call_desk_outcome" in actions


@pytest.mark.asyncio
async def test_hold_blocks_only_lead_recovery(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    phone = "03003332211"

    # Initially not held
    assert await is_held(phone, session=test_session) is False
    assert await can_send_message(phone, "lead_recovery", session=test_session) is True
    assert await can_send_message(phone, "reminder", session=test_session) is True
    assert await can_send_message(phone, "confirmation", session=test_session) is True

    # Place hold
    await client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": phone, "holdMinutes": 30},
        headers=headers,
    )

    # Now held: lead_recovery is BLOCKED, but reminder and confirmation are NEVER blocked
    assert await is_held(phone, session=test_session) is True
    assert await can_send_message(phone, "lead_recovery", session=test_session) is False
    assert await can_send_message(phone, "reminder", session=test_session) is True
    assert await can_send_message(phone, "confirmation", session=test_session) is True

    # Release hold: lead_recovery unblocked
    await client.delete(f"/api/v1/reception/call-desk/holds?phone={phone}", headers=headers)
    assert await is_held(phone, session=test_session) is False
    assert await can_send_message(phone, "lead_recovery", session=test_session) is True


@pytest.mark.asyncio
async def test_real_lead_recovery_message_blocked_during_hold_and_reminders_allowed(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    phone = "03004445566"

    # 1. Place contact hold
    hold_res = await client.post(
        "/api/v1/reception/call-desk/holds",
        json={"phone": phone, "holdMinutes": 30},
        headers=headers,
    )
    assert hold_res.status_code == 200
    assert await is_held(phone, session=test_session) is True

    # 2. Attempt lead_recovery message via API -> MUST BE BLOCKED (HTTP 409)
    res_lead_rec = await client.post(
        "/api/v1/reception/messages",
        json={
            "phone": phone,
            "content": "Hi, we saw you started booking. Would you like some help?",
            "channel": "sms",
            "direction": "outbound",
            "purpose": "lead_recovery",
        },
        headers=headers,
    )
    assert res_lead_rec.status_code == 409
    assert "held by Call Desk" in res_lead_rec.json()["detail"]

    # 3. Confirmation message -> NEVER BLOCKED (HTTP 201)
    res_conf = await client.post(
        "/api/v1/reception/messages",
        json={
            "phone": phone,
            "content": "Your appointment is confirmed for tomorrow at 10:00 AM.",
            "channel": "sms",
            "direction": "outbound",
            "purpose": "confirmation",
        },
        headers=headers,
    )
    assert res_conf.status_code == 201

    # 4. Reminder message -> NEVER BLOCKED (HTTP 201)
    res_rem = await client.post(
        "/api/v1/reception/messages",
        json={
            "phone": phone,
            "content": "Reminder: your dental checkup is at 10:00 AM.",
            "channel": "sms",
            "direction": "outbound",
            "purpose": "reminder",
        },
        headers=headers,
    )
    assert res_rem.status_code == 201

    # 5. Release hold -> now lead_recovery is allowed
    await client.delete(f"/api/v1/reception/call-desk/holds?phone={phone}", headers=headers)
    assert await is_held(phone, session=test_session) is False

    res_lead_rec_unblocked = await client.post(
        "/api/v1/reception/messages",
        json={
            "phone": phone,
            "content": "Hi, we saw you started booking. Can we help?",
            "channel": "sms",
            "direction": "outbound",
            "purpose": "lead_recovery",
        },
        headers=headers,
    )
    assert res_lead_rec_unblocked.status_code == 201


@pytest.mark.asyncio
async def test_call_desk_mode_booking_does_not_create_website_abandon_lead(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    caller_phone = "03219988776"
    norm_phone = normalize_pakistan_phone(caller_phone)

    # Pre-seed an unconverted lead for this caller
    existing_lead = LeadORM(
        full_name="Existing Lead Caller",
        phone=caller_phone,
        phone_normalized=norm_phone,
        email="lead.caller@example.com",
        status="unconverted",
        utm_source="call_desk",
        attempts=1,
    )
    test_session.add(existing_lead)
    await test_session.commit()
    await test_session.refresh(existing_lead)
    lead_id = existing_lead.id

    # Book via reception booking endpoint in call desk mode (source="call_desk")
    booking_date = str(date.today() + timedelta(days=2))
    b_res = await client.post(
        "/api/v1/reception/appointments",
        json={
            "patientFullName": "Existing Lead Caller",
            "patientPhone": caller_phone,
            "patientEmail": "lead.caller@example.com",
            "preferredDate": booking_date,
            "preferredTime": "11:00 AM",
            "source": "call_desk",
            "status": "confirmed",
        },
        headers=headers,
    )
    assert b_res.status_code in (200, 201)
    booking_data = b_res.json()
    assert booking_data["source"] == "call_desk"

    # Assert that no new unconverted or website_abandon lead was created
    new_leads_stmt = select(LeadORM).where(
        LeadORM.phone_normalized == norm_phone,
        LeadORM.status == "unconverted",
    )
    open_leads = (await test_session.execute(new_leads_stmt)).scalars().all()
    assert len(open_leads) == 0

    # Assert that the existing lead was automatically transitioned to converted
    await test_session.refresh(existing_lead)
    assert existing_lead.status == "converted"


@pytest.mark.asyncio
async def test_lead_contact_attempts_and_mark_cold_job(receptionist_auth, test_session):
    client = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    from app.application.services.lead_status_service import LeadStatusService
    from app.infrastructure.database.orm_models import BookingFlowSettingsORM, OrganizationORM, TaskORM

    # Configure flow settings: max_attempts=3, cold_wait_hours=24, followup_gaps_minutes=[10, 1440, 2880]
    org_res = await test_session.execute(select(OrganizationORM).limit(1))
    org = org_res.scalar_one_or_none()
    if not org:
        org = OrganizationORM(id=uuid4(), name="Marlow Dental Practice", display_name="Marlow Dental Practice")
        test_session.add(org)
        await test_session.flush()

    settings_res = await test_session.execute(select(BookingFlowSettingsORM).limit(1))
    flow_settings = settings_res.scalar_one_or_none()
    if not flow_settings:
        flow_settings = BookingFlowSettingsORM(
            organization_id=org.id,
            max_attempts=3,
            cold_wait_hours=24,
            followup_gaps_minutes=[10, 1440, 2880],
        )
        test_session.add(flow_settings)
    else:
        flow_settings.max_attempts = 3
        flow_settings.cold_wait_hours = 24
        flow_settings.followup_gaps_minutes = [10, 1440, 2880]
    await test_session.commit()

    # Create lead
    lead = LeadORM(
        full_name="Lead Attempts Test Patient",
        phone="03335558899",
        phone_normalized="923335558899",
        status="unconverted",
        attempts=0,
    )
    test_session.add(lead)
    await test_session.commit()
    await test_session.refresh(lead)

    # Log 3 attempts via API
    for i in range(1, 4):
        att_res = await client.post(
            f"/api/v1/reception/leads/{lead.id}/attempt",
            json={
                "channel": "phone",
                "result": "no_answer",
                "note": f"Contact attempt #{i} - caller did not answer",
            },
            headers=headers,
        )
        assert att_res.status_code == 200
        data = att_res.json()
        assert data["attempts"] == i
        assert data["lastContactedAt"] is not None

    await test_session.refresh(lead)
    assert lead.attempts == 3

    # Verify lead_events has contact_attempt records
    ev_stmt = select(LeadEventORM).where(
        LeadEventORM.lead_id == lead.id,
        LeadEventORM.event_type == "contact_attempt",
    )
    events = (await test_session.execute(ev_stmt)).scalars().all()
    assert len(events) == 3

    # Fast forward: cold_wait_hours (24h) passed with no booking or inbound message
    lead.last_contacted_at = datetime.now(timezone.utc) - timedelta(hours=25)
    await test_session.commit()

    # Run mark_cold_leads job
    status_service = LeadStatusService(test_session)
    result = await status_service.mark_cold_leads()
    assert result["marked_cold_count"] >= 1
    assert str(lead.id) in result["lead_ids"]

    # Lead status is now cold
    await test_session.refresh(lead)
    assert lead.status == "cold"
    assert lead.cold_at is not None

    # Exactly one task created for follow-up
    task_stmt = select(TaskORM).where(TaskORM.title.contains("Lead Attempts Test Patient"))
    tasks = (await test_session.execute(task_stmt)).scalars().all()
    assert len(tasks) == 1
    assert "3 attempts reached" in tasks[0].description


@pytest.mark.asyncio
async def test_doctor_schedule_response_keys_contain_zero_lead_fields(receptionist_auth, test_session):
    client = receptionist_auth["client"]

    # Import DoctorScheduleBookingDto and verify its keys
    from app.application.dtos.reception_dto import DoctorScheduleBookingDto

    dto_keys = list(DoctorScheduleBookingDto.model_fields.keys())

    # Assert doctor schedule response keys have NO lead CRM fields
    assert "leadId" not in dto_keys
    assert "leadStatus" not in dto_keys
    assert "utmSource" not in dto_keys
    assert "utmCampaign" not in dto_keys
    assert "attempts" not in dto_keys
    assert not any("lead" in k.lower() for k in dto_keys)

    # Assert doctor schedule response includes source badge and isFirstVisit
    assert "source" in dto_keys
    assert "isFirstVisit" in dto_keys

