from datetime import date, datetime, timedelta, timezone
from uuid import uuid4
import pytest
from sqlalchemy import select

from app.domain.models.booking_flow import LeadStatus
from app.infrastructure.database.orm_models import (
    BookingFlowSettingsORM,
    BookingORM,
    CallLogORM,
    LeadEventORM,
    LeadORM,
    MessageORM,
    PatientORM,
    TaskORM,
)
from app.application.services.lead_status_service import LeadStatusService


@pytest.mark.asyncio
async def test_lead_capture_starts_unconverted(test_session, client_with_db, receptionist_auth):
    """Rule 1: Lead capture starts at 'unconverted'."""
    lead = LeadORM(
        full_name="Fatima Ali",
        phone="+92 300 1112233",
        phone_normalized="923001112233",
        status=LeadStatus.UNCONVERTED.value,
        utm_source="website_abandon",
    )
    test_session.add(lead)
    await test_session.commit()

    resp = await client_with_db.get(
        f"/api/v1/reception/leads?status=unconverted",
        headers=receptionist_auth["headers"],
    )
    assert resp.status_code == 200
    leads = resp.json()
    assert any(l["id"] == str(lead.id) and l["status"] == "unconverted" for l in leads)


@pytest.mark.asyncio
async def test_booking_created_transitions_lead_to_converted(test_session):
    """Rule 2: Booking created transitions lead to 'converted' (direct & phone-linked)."""
    lead_service = LeadStatusService(test_session)

    lead1 = LeadORM(
        full_name="Hamza Tariq",
        phone="+92 321 4445566",
        phone_normalized="923214445566",
        status=LeadStatus.UNCONVERTED.value,
        utm_source="call_desk",
    )
    test_session.add(lead1)
    await test_session.commit()

    booking = BookingORM(
        confirmation_id=f"CONF-{uuid4().hex[:6].upper()}",
        patient_full_name="Hamza Tariq",
        patient_phone="+92 321 4445566",
        phone_normalized="923214445566",
        preferred_date=date.today() + timedelta(days=2),
        preferred_time="11:00",
        status="requested",
        lead_id=lead1.id,
        source="call_desk",
    )
    test_session.add(booking)
    await test_session.commit()

    converted = await lead_service.on_booking_created(booking)
    assert lead1.id in converted
    await test_session.refresh(lead1)
    assert lead1.status == LeadStatus.CONVERTED.value

    # Check lead_converted event was written
    stmt = select(LeadEventORM).where(LeadEventORM.lead_id == lead1.id)
    events = (await test_session.execute(stmt)).scalars().all()
    assert any(e.event_type == "lead_converted" for e in events)


@pytest.mark.asyncio
async def test_first_booking_completed_transitions_lead_to_patient(test_session):
    """Rule 3: First booking marked completed transitions lead to 'patient' (covers phone/patient_id links)."""
    lead_service = LeadStatusService(test_session)

    patient = PatientORM(
        first_name="Zainab",
        last_name="Khan",
        phone="+92 333 5556677",
        phone_normalized="923335556677",
        is_active=True,
    )
    test_session.add(patient)
    await test_session.flush()

    lead = LeadORM(
        full_name="Zainab Khan",
        phone="+92 333 5556677",
        phone_normalized="923335556677",
        patient_id=patient.id,
        status=LeadStatus.CONVERTED.value,
        utm_source="website_booking",
    )
    test_session.add(lead)
    await test_session.flush()

    # First completed booking
    booking1 = BookingORM(
        confirmation_id=f"CONF-{uuid4().hex[:6].upper()}",
        patient_id=patient.id,
        patient_full_name="Zainab Khan",
        patient_phone="+92 333 5556677",
        phone_normalized="923335556677",
        preferred_date=date.today(),
        preferred_time="10:00",
        status="completed",
        lead_id=lead.id,
    )
    test_session.add(booking1)
    await test_session.commit()

    updated = await lead_service.on_booking_completed(booking1)
    assert lead.id in updated
    await test_session.refresh(lead)
    assert lead.status == LeadStatus.PATIENT.value

    # Verify event was recorded
    stmt = select(LeadEventORM).where(LeadEventORM.lead_id == lead.id)
    evs = (await test_session.execute(stmt)).scalars().all()
    assert any(e.event_type == "became_patient" for e in evs)

    # Subsequent completed bookings should NOT revert or re-trigger
    booking2 = BookingORM(
        confirmation_id=f"CONF-{uuid4().hex[:6].upper()}",
        patient_id=patient.id,
        patient_full_name="Zainab Khan",
        patient_phone="+92 333 5556677",
        phone_normalized="923335556677",
        preferred_date=date.today() + timedelta(days=7),
        preferred_time="14:00",
        status="completed",
    )
    test_session.add(booking2)
    await test_session.commit()

    updated_second = await lead_service.on_booking_completed(booking2)
    assert updated_second == []
    await test_session.refresh(lead)
    assert lead.status == LeadStatus.PATIENT.value  # No reverts


@pytest.mark.asyncio
async def test_cold_rule_and_idempotency(test_session):
    """
    Cold rule: marks leads cold when attempts >= max_attempts and cold_wait_hours have passed
    with no reply or booking; creates exactly one task; idempotent.
    """
    lead_service = LeadStatusService(test_session)

    # Seed flow settings: max_attempts=3, cold_wait_hours=24
    settings = BookingFlowSettingsORM(
        organization_id=uuid4(),
        max_attempts=3,
        cold_wait_hours=24,
        hold_minutes=30,
        fallback_owner_user_id=None,
    )
    test_session.add(settings)

    # Lead that qualifies: 3 attempts, last contacted 30 hours ago, no messages or booking
    old_contact = datetime.now(timezone.utc) - timedelta(hours=30)
    cold_candidate = LeadORM(
        full_name="Usman Chaudhry",
        phone="+92 345 9876543",
        phone_normalized="923459876543",
        status=LeadStatus.UNCONVERTED.value,
        attempts=3,
        last_contacted_at=old_contact,
        utm_source="whatsapp_message",
    )
    # Lead that does NOT qualify: only 1 attempt
    not_cold = LeadORM(
        full_name="Bilal Shah",
        phone="+92 345 1112222",
        phone_normalized="923451112222",
        status=LeadStatus.UNCONVERTED.value,
        attempts=1,
        last_contacted_at=old_contact,
        utm_source="website_abandon",
    )
    test_session.add_all([cold_candidate, not_cold])
    await test_session.commit()

    # Run cold rule job
    marked = await lead_service.mark_cold_leads()
    assert str(cold_candidate.id) in marked["lead_ids"]
    assert str(not_cold.id) not in marked["lead_ids"]
    assert marked["marked_cold_count"] == 1

    await test_session.refresh(cold_candidate)
    assert cold_candidate.status == LeadStatus.COLD.value
    assert cold_candidate.cold_at is not None

    # Verify exactly ONE task created
    task_stmt = select(TaskORM).where(TaskORM.title == "Call to follow up: Usman Chaudhry")
    tasks = (await test_session.execute(task_stmt)).scalars().all()
    assert len(tasks) == 1
    assert tasks[0].priority == "medium"

    # IDEMPOTENCY: Run again immediately, should NOT create duplicate task or mark again
    marked_again = await lead_service.mark_cold_leads()
    assert marked_again["marked_cold_count"] == 0
    assert marked_again["lead_ids"] == []

    tasks_after = (await test_session.execute(task_stmt)).scalars().all()
    assert len(tasks_after) == 1


@pytest.mark.asyncio
async def test_failed_conversion_service_rule(test_session):
    """
    failed_conversion rule: transitions to failed_conversion, creates single follow-up task, writes event.
    """
    lead_service = LeadStatusService(test_session)

    lead = LeadORM(
        full_name="Nadia Bashir",
        phone="+92 312 8889900",
        phone_normalized="923128889900",
        status=LeadStatus.UNCONVERTED.value,
        utm_source="phone_missed_call",
    )
    test_session.add(lead)
    await test_session.commit()

    updated_lead = await lead_service.mark_failed_conversion(
        lead_id=lead.id,
        reason="Automation reports WhatsApp, SMS, and Voice calls all unreachable",
    )
    assert updated_lead.status == LeadStatus.FAILED_CONVERSION.value

    # Verify task created
    task_stmt = select(TaskORM).where(TaskORM.title == "Call to follow up: Nadia Bashir")
    task = (await test_session.execute(task_stmt)).scalars().first()
    assert task is not None
    assert task.priority == "high"

    # Verify event written
    ev_stmt = select(LeadEventORM).where(LeadEventORM.lead_id == lead.id)
    evs = (await test_session.execute(ev_stmt)).scalars().all()
    assert any(e.event_type == "failed_conversion" for e in evs)


@pytest.mark.asyncio
async def test_manual_status_change_requires_reason_and_audited(
    test_session, client_with_db, receptionist_auth
):
    """Receptionist can manually change status with audit reason; empty reason rejected."""
    lead = LeadORM(
        full_name="Farhan Malik",
        phone="+92 301 7776655",
        phone_normalized="923017776655",
        status=LeadStatus.UNCONVERTED.value,
        utm_source="manual",
    )
    test_session.add(lead)
    await test_session.commit()

    # 1. Attempt manual update without reason -> 422 Unprocessable Entity
    resp_empty = await client_with_db.patch(
        f"/api/v1/reception/leads/{lead.id}/status",
        json={"status": "cold", "reason": ""},
        headers=receptionist_auth["headers"],
    )
    assert resp_empty.status_code == 422

    # 2. Update with valid audit reason -> 200 OK
    resp_ok = await client_with_db.patch(
        f"/api/v1/reception/leads/{lead.id}/status",
        json={"status": "cold", "reason": "Patient requested contact hold until next month"},
        headers=receptionist_auth["headers"],
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["status"] == "cold"

    # Verify event logged in lead timeline
    timeline_resp = await client_with_db.get(
        f"/api/v1/reception/leads/{lead.id}/timeline",
        headers=receptionist_auth["headers"],
    )
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()
    assert any(
        item["type"] == "event"
        and item.get("payload", {}).get("reason") == "Patient requested contact hold until next month"
        for item in timeline
    )


@pytest.mark.asyncio
async def test_role_access_leads_endpoints(client_with_db, doctor_auth, receptionist_auth):
    """Doctor role gets 403 on reception leads; receptionist gets 200."""
    # Doctor forbidden
    doc_resp = await client_with_db.get(
        "/api/v1/reception/leads",
        headers=doctor_auth["headers"],
    )
    assert doc_resp.status_code == 403

    # Receptionist allowed
    rec_resp = await client_with_db.get(
        "/api/v1/reception/leads",
        headers=receptionist_auth["headers"],
    )
    assert rec_resp.status_code == 200


@pytest.mark.asyncio
async def test_schedule_and_booking_role_isolation(
    test_session, client_with_db, doctor_auth, receptionist_auth
):
    """
    Requirement 6:
    Receptionist schedule cards show source and leadStatus.
    Doctor schedule sees source badge and first visit ONLY (no lead details: leadId=None, leadStatus=None).
    """
    lead = LeadORM(
        full_name="Amina Saeed",
        phone="+92 302 3334455",
        phone_normalized="923023334455",
        status=LeadStatus.CONVERTED.value,
        utm_source="website_booking",
    )
    test_session.add(lead)
    await test_session.flush()

    booking = BookingORM(
        confirmation_id=f"CONF-{uuid4().hex[:6].upper()}",
        patient_full_name="Amina Saeed",
        patient_phone="+92 302 3334455",
        phone_normalized="923023334455",
        preferred_date=date.today(),
        preferred_time="09:30",
        status="requested",
        lead_id=lead.id,
        team_member_id=doctor_auth["team_member"].id,
        source="website_booking",
    )
    test_session.add(booking)
    await test_session.commit()

    # 1. Reception view
    rec_schedule = await client_with_db.get(
        f"/api/v1/reception/schedule?date_from={date.today()}&date_to={date.today()}",
        headers=receptionist_auth["headers"],
    )
    assert rec_schedule.status_code == 200
    rec_items = rec_schedule.json()
    b_rec = next((item for item in rec_items if item["id"] == str(booking.id)), None)
    assert b_rec is not None
    assert b_rec["source"] == "website_booking"
    assert b_rec["leadStatus"] == "converted"
    assert b_rec["leadId"] == str(lead.id)

    # 2. Doctor view
    doc_schedule = await client_with_db.get(
        f"/api/v1/doctor/schedule?date={date.today()}",
        headers=doctor_auth["headers"],
    )
    assert doc_schedule.status_code == 200
    doc_items = doc_schedule.json()
    b_doc = next((item for item in doc_items if item["id"] == str(booking.id)), None)
    assert b_doc is not None
    assert b_doc["source"] == "website_booking"
    assert b_doc.get("leadStatus") is None  # Doctor sees NO lead details
    assert b_doc.get("leadId") is None  # Doctor sees NO leadId
    assert "leadStatus" not in b_doc
    assert "leadId" not in b_doc


@pytest.mark.asyncio
async def test_funnel_report_numbers_and_csv_export(test_session, client_with_db, admin_auth):
    """
    Requirement 7:
    Funnel counts (captured, converted, patient, cold, failed) and source breakdown
    on /admin/reports with aggregate-only CSV export.
    """
    # Seed leads with different statuses and sources
    today_dt = datetime.now(timezone.utc)
    leads = [
        LeadORM(full_name="P1", phone="923001", status="unconverted", utm_source="call_desk", created_at=today_dt),
        LeadORM(full_name="P2", phone="923002", status="converted", utm_source="call_desk", created_at=today_dt),
        LeadORM(full_name="P3", phone="923003", status="patient", utm_source="website_booking", created_at=today_dt),
        LeadORM(full_name="P4", phone="923004", status="cold", utm_source="website_abandon", created_at=today_dt),
        LeadORM(full_name="P5", phone="923005", status="failed_conversion", utm_source="whatsapp_message", created_at=today_dt),
    ]
    test_session.add_all(leads)
    await test_session.commit()

    # 1. JSON Report
    resp = await client_with_db.get(
        f"/api/v1/admin/reports/lead-funnel?start_date={date.today()}&end_date={date.today()}",
        headers=admin_auth["headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    funnel = data["funnel"]
    assert funnel["captured"] == 5
    assert funnel["unconverted"] == 1
    assert funnel["converted"] == 1
    assert funnel["patient"] == 1
    assert funnel["cold"] == 1
    assert funnel["failed"] == 1

    sources = {s["source"]: s for s in data["sources"]}
    assert "call_desk" in sources
    assert sources["call_desk"]["totalLeads"] == 2
    assert sources["call_desk"]["convertedLeads"] == 1
    assert sources["call_desk"]["conversionRatePercent"] == 50.0

    # 2. CSV Export (Aggregate only)
    csv_resp = await client_with_db.get(
        f"/api/v1/admin/reports/export/lead-funnel?start_date={date.today()}&end_date={date.today()}",
        headers=admin_auth["headers"],
    )
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    csv_text = csv_resp.text
    # Aggregate only: NO patient PII (e.g. no phone numbers or names)
    assert "923001" not in csv_text
    assert "P1" not in csv_text
    assert "Total Captured,5" in csv_text
    assert "call_desk,2,1,0,0,0,50.0%" in csv_text
