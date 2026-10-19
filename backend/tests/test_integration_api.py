import os
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.config import settings
from app.domain.models.integration import generate_integration_key
from app.infrastructure.database.orm_models import (
    ActivityLogORM,
    BookingFlowSettingsORM,
    BookingORM,
    ClinicORM,
    ClinicServiceORM,
    ContactHoldORM,
    IntegrationClientORM,
    LeadEventORM,
    LeadORM,
    MessageORM,
    OrganizationORM,
    PatientORM,
    ServiceORM,
    TaskORM,
    TeamMemberORM,
    UserORM,
)


@pytest_asyncio.fixture
async def setup_integration_data(test_session):
    # 1. Seed Organization
    org = OrganizationORM(
        id=uuid4(),
        name="Marlow Test Dental",
        display_name="Marlow Test Dental",
    )
    test_session.add(org)
    await test_session.flush()

    # 2. Seed Booking Flow Settings
    flow_settings = BookingFlowSettingsORM(
        id=uuid4(),
        organization_id=org.id,
        followup_gaps_minutes=[15, 60, 240],
        max_attempts=3,
        cold_wait_hours=24,
        hold_minutes=30,
        auto_confirm_online=True,
        days_shown=7,
        show_patients_treated=True,
    )
    test_session.add(flow_settings)

    # 3. Seed Clinic
    clinic = ClinicORM(
        id=uuid4(),
        organization_id=org.id,
        name="Main Clinic Lahore",
        address_line1="Plaza 45, Phase 5 DHA",
        city="Lahore",
        state="Punjab",
        postal_code="54000",
        phone="04235891234",
        is_active=True,
    )
    test_session.add(clinic)
    await test_session.flush()

    # 4. Seed Service
    service = ServiceORM(
        id=uuid4(),
        slug="general-consultation",
        category="General",
        title="General Consultation",
        short_desc="Comprehensive oral exam and consultation",
        cash_price="Rs 2,500",
        duration="30 min",
        is_active=True,
        is_public=True,
    )
    test_session.add(service)
    await test_session.flush()

    # 5. Seed Clinic-Service
    cs = ClinicServiceORM(
        id=uuid4(),
        clinic_id=clinic.id,
        service_id=service.id,
        is_active=True,
    )
    test_session.add(cs)

    # 6. Seed Doctor
    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=clinic.id,
        first_name="Sarah",
        last_name="Tariq",
        display_name="Dr. Sarah Tariq",
        professional_title="BDS, RDS Lead Dentist",
        role="Doctor",
        is_active=True,
        show_patients_treated=True,
    )
    test_session.add(doctor)

    # 7. Seed Admin User
    admin_user = UserORM(
        id=uuid4(),
        email="admin@marlowdental.com",
        full_name="Admin Test",
        role="admin",
        hashed_password="mock",
        is_active=True,
    )
    test_session.add(admin_user)
    await test_session.flush()

    # 8. Seed Integration Client with full scopes
    raw_key, prefix, key_hash = generate_integration_key()
    client = IntegrationClientORM(
        id=uuid4(),
        name="WhatsApp Production Bot",
        key_prefix=prefix,
        key_hash=key_hash,
        scopes=["leads:read", "leads:write", "messages:read", "messages:write", "bookings:read", "bookings:write", "lookup:read"],
        is_active=True,
        created_by_user_id=admin_user.id,
    )
    test_session.add(client)

    # 9. Seed Read-Only Client (for wrong scope tests)
    ro_raw_key, ro_prefix, ro_key_hash = generate_integration_key()
    ro_client = IntegrationClientORM(
        id=uuid4(),
        name="Read-Only Client",
        key_prefix=ro_prefix,
        key_hash=ro_key_hash,
        scopes=["leads:read"],
        is_active=True,
        created_by_user_id=admin_user.id,
    )
    test_session.add(ro_client)

    # 10. Seed Revoked Client
    rev_raw_key, rev_prefix, rev_key_hash = generate_integration_key()
    rev_client = IntegrationClientORM(
        id=uuid4(),
        name="Revoked Client",
        key_prefix=rev_prefix,
        key_hash=rev_key_hash,
        scopes=["leads:write"],
        is_active=False,
        created_by_user_id=admin_user.id,
    )
    test_session.add(rev_client)

    # 11. Seed IP-Restricted Client
    ip_raw_key, ip_prefix, ip_key_hash = generate_integration_key()
    ip_client = IntegrationClientORM(
        id=uuid4(),
        name="IP Restricted Client",
        key_prefix=ip_prefix,
        key_hash=ip_key_hash,
        scopes=["leads:read", "lookup:read"],
        is_active=True,
        ip_allowlist=["192.168.1.50"],
        created_by_user_id=admin_user.id,
    )
    test_session.add(ip_client)

    await test_session.commit()

    return {
        "raw_key": raw_key,
        "client_id": client.id,
        "ro_raw_key": ro_raw_key,
        "ro_client_id": ro_client.id,
        "rev_raw_key": rev_raw_key,
        "ip_raw_key": ip_raw_key,
        "clinic_id": clinic.id,
        "service_id": service.id,
        "doctor_id": doctor.id,
        "admin_user_id": admin_user.id,
    }


# ============================================================================
# 1. AUTHENTICATION & SCOPE ENFORCEMENT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_auth_failure_missing_key(client_with_db):
    """Assert requests without X-Marlow-Key header return 401."""
    res = await client_with_db.get("/api/v1/integration/lookup?phone=03001234567")
    assert res.status_code == 401
    assert "Missing API key in X-Marlow-Key header" in res.json()["detail"]


@pytest.mark.asyncio
async def test_auth_failure_invalid_key(client_with_db):
    """Assert requests with non-existent or malformed key return 401."""
    bad_key = f"mk_{uuid4().hex}{uuid4().hex}"
    res = await client_with_db.get(
        "/api/v1/integration/lookup?phone=03001234567",
        headers={"X-Marlow-Key": bad_key},
    )
    assert res.status_code == 401
    assert "Invalid or revoked API key" in res.json()["detail"]


@pytest.mark.asyncio
async def test_auth_failure_revoked_key(setup_integration_data, client_with_db):
    """Assert revoked client keys return 401."""
    rev_key = setup_integration_data["rev_raw_key"]
    res = await client_with_db.get(
        "/api/v1/integration/lookup?phone=03001234567",
        headers={"X-Marlow-Key": rev_key},
    )
    assert res.status_code == 401
    assert "Invalid or revoked API key" in res.json()["detail"]


@pytest.mark.asyncio
async def test_auth_wrong_scope(setup_integration_data, client_with_db):
    """Assert client with leads:read is rejected when accessing bookings:write endpoint."""
    ro_key = setup_integration_data["ro_raw_key"]
    res = await client_with_db.post(
        "/api/v1/integration/bookings",
        headers={"X-Marlow-Key": ro_key},
        json={
            "patientName": "Ayesha Malik",
            "patientPhone": "03001234567",
            "serviceId": str(setup_integration_data["service_id"]),
            "clinicId": str(setup_integration_data["clinic_id"]),
            "doctorId": str(setup_integration_data["doctor_id"]),
            "bookingDate": "2026-10-25",
            "bookingTime": "11:00",
        },
    )
    assert res.status_code == 403
    assert "Forbidden: integration client lacks required scope 'bookings:write'" in res.json()["detail"]


@pytest.mark.asyncio
async def test_ip_allowlist_enforcement(setup_integration_data, client_with_db):
    """Assert request from unauthorized IP is rejected with 401."""
    ip_key = setup_integration_data["ip_raw_key"]
    res = await client_with_db.get(
        "/api/v1/integration/lookup?phone=03001234567",
        headers={"X-Marlow-Key": ip_key, "X-Forwarded-For": "10.0.0.1"},
    )
    assert res.status_code == 401


# ============================================================================
# 2. LEAD CAPTURE & ATTEMPTS
# ============================================================================

@pytest.mark.asyncio
async def test_capture_lead_and_attempts(setup_integration_data, client_with_db):
    """Test capturing a lead, logging contact attempts, and updating gaps."""
    key = setup_integration_data["raw_key"]

    # 1. Capture Lead
    res = await client_with_db.post(
        "/api/v1/integration/leads",
        headers={"X-Marlow-Key": key},
        json={
            "name": "Kamran Khan",
            "phone": "0300 7654321",
            "email": "kamran@example.com",
            "source": "whatsapp_message",
            "notes": "Inquired about teeth cleaning",
        },
    )
    assert res.status_code == 201
    lead_data = res.json()
    assert lead_data["phoneNormalized"] == "923007654321"
    assert lead_data["status"] == "unconverted"
    assert lead_data["attempts"] == 0
    lead_id = lead_data["id"]

    # 2. Log Attempt 1
    res = await client_with_db.post(
        f"/api/v1/integration/leads/{lead_id}/attempt",
        headers={"X-Marlow-Key": key},
        json={
            "channel": "whatsapp",
            "result": "no_answer",
            "notes": "Sent WhatsApp message, unread",
        },
    )
    assert res.status_code == 200
    attempt1 = res.json()
    assert attempt1["attempts"] == 1
    assert attempt1["status"] == "unconverted"
    assert attempt1["nextAttemptAt"] is not None

    # 3. Log Attempt 2
    res = await client_with_db.post(
        f"/api/v1/integration/leads/{lead_id}/attempt",
        headers={"X-Marlow-Key": key},
        json={"channel": "call", "result": "busy"},
    )
    assert res.status_code == 200
    attempt2 = res.json()
    assert attempt2["attempts"] == 2
    assert attempt2["status"] == "unconverted"


# ============================================================================
# 3. DUE LEADS EXCLUDES HELD NUMBERS AND CONVERTED
# ============================================================================

@pytest.mark.asyncio
async def test_due_leads_excludes_held_numbers_and_converted(setup_integration_data, client_with_db, test_session):
    """Assert due leads query excludes held phone numbers and converted leads."""
    key = setup_integration_data["raw_key"]
    now = datetime.now(timezone.utc)

    # Lead A: Due for follow-up
    lead_due = LeadORM(
        id=uuid4(),
        full_name="Due Followup Lead",
        phone="03001111111",
        phone_normalized="923001111111",
        status="unconverted",
        attempts=1,
        next_attempt_at=now - timedelta(minutes=5),
        utm_source="whatsapp_message",
        created_at=now - timedelta(hours=2),
        updated_at=now - timedelta(hours=2),
    )
    test_session.add(lead_due)

    # Lead B: Due but phone is actively held by Call Desk
    held_phone = "923002222222"
    lead_held = LeadORM(
        id=uuid4(),
        full_name="Held Followup Lead",
        phone="03002222222",
        phone_normalized=held_phone,
        status="unconverted",
        attempts=1,
        next_attempt_at=now - timedelta(minutes=5),
        utm_source="whatsapp_message",
        created_at=now - timedelta(hours=2),
        updated_at=now - timedelta(hours=2),
    )
    test_session.add(lead_held)

    hold = ContactHoldORM(
        id=uuid4(),
        phone_normalized=held_phone,
        held_until=now + timedelta(minutes=20),
        released_at=None,
        created_at=now,
    )
    test_session.add(hold)

    # Lead C: Converted lead (must never appear in due list)
    lead_converted = LeadORM(
        id=uuid4(),
        full_name="Converted Lead",
        phone="03003333333",
        phone_normalized="923003333333",
        status="converted",
        attempts=1,
        next_attempt_at=now - timedelta(minutes=5),
        utm_source="whatsapp_message",
        created_at=now - timedelta(hours=2),
        updated_at=now - timedelta(hours=2),
    )
    test_session.add(lead_converted)

    await test_session.commit()

    # Query due leads
    res = await client_with_db.get(
        "/api/v1/integration/leads/due",
        headers={"X-Marlow-Key": key},
    )
    assert res.status_code == 200
    data = res.json()
    returned_ids = [l["id"] for l in data["leads"]]

    assert str(lead_due.id) in returned_ids
    assert str(lead_held.id) not in returned_ids  # Excluded because phone is held
    assert str(lead_converted.id) not in returned_ids  # Excluded because converted


# ============================================================================
# 4. MESSAGE DEDUPLICATION
# ============================================================================

@pytest.mark.asyncio
async def test_deduplication_of_messages(setup_integration_data, client_with_db):
    """Assert recording message with same provider + provider_message_id is idempotent."""
    key = setup_integration_data["raw_key"]

    msg_payload = {
        "direction": "inbound",
        "channel": "whatsapp",
        "purpose": "lead_recovery",
        "recipientPhone": "03001234567",
        "body": "Hi, I want to book an appointment tomorrow at 10 AM",
        "provider": "meta",
        "providerMessageId": "wamid.HBgLMOTIzMDAxMjM0NTY3FQIAERgSMzNBMjAw",
    }

    # First delivery
    res1 = await client_with_db.post(
        "/api/v1/integration/messages",
        headers={"X-Marlow-Key": key},
        json=msg_payload,
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["deduplicated"] is False
    msg_id = data1["id"]

    # Second delivery with exact same provider and providerMessageId
    res2 = await client_with_db.post(
        "/api/v1/integration/messages",
        headers={"X-Marlow-Key": key},
        json=msg_payload,
    )
    assert res2.status_code == 200  # Returns existing message
    data2 = res2.json()
    assert data2["deduplicated"] is True
    assert data2["id"] == msg_id


# ============================================================================
# 5. LEAD TRANSITIONS & FAILED CONVERSION
# ============================================================================

@pytest.mark.asyncio
async def test_lead_status_transitions_and_failed_conversion(setup_integration_data, client_with_db, test_session):
    """Test valid lead transitions and mark failed_conversion creates exactly 1 task."""
    key = setup_integration_data["raw_key"]

    # Create lead
    res = await client_with_db.post(
        "/api/v1/integration/leads",
        headers={"X-Marlow-Key": key},
        json={"name": "Usman Tariq", "phone": "03211234567"},
    )
    lead_id = res.json()["id"]

    # Transition to cold
    res = await client_with_db.patch(
        f"/api/v1/integration/leads/{lead_id}/status",
        headers={"X-Marlow-Key": key},
        json={"status": "cold", "notes": "No response after multiple channels"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "cold"

    # Invalid status should return 422
    res = await client_with_db.patch(
        f"/api/v1/integration/leads/{lead_id}/status",
        headers={"X-Marlow-Key": key},
        json={"status": "bogus_status"},
    )
    assert res.status_code == 422

    # Mark failed conversion
    res = await client_with_db.post(
        f"/api/v1/integration/leads/{lead_id}/failed-conversion",
        headers={"X-Marlow-Key": key},
        json={"reason": "All 3 channels exhausted with no response"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "failed_conversion"

    # Assert exactly 1 task created in DB
    t_stmt = select(TaskORM).where(TaskORM.title.contains("Failed lead conversion"))
    t_res = await test_session.execute(t_stmt)
    tasks = t_res.scalars().all()
    assert len(tasks) == 1
    assert "Failed lead conversion" in tasks[0].title


# ============================================================================
# 6. PHONE LOOKUP & PRIOR CHOICES
# ============================================================================

@pytest.mark.asyncio
async def test_phone_lookup_and_prior_choices(setup_integration_data, client_with_db, test_session):
    """Test lookup returns caller patient details, lead, and prior choices from last booking."""
    key = setup_integration_data["raw_key"]

    test_phone = "923008889999"
    patient = PatientORM(
        id=uuid4(),
        first_name="Fatima",
        last_name="Zahra",
        phone="03008889999",
        phone_normalized=test_phone,
    )
    test_session.add(patient)

    # Prior booking
    prior_b = BookingORM(
        id=uuid4(),
        confirmation_id="MD-PRIOR1",
        patient_id=patient.id,
        patient_full_name="Fatima Zahra",
        patient_phone=test_phone,
        phone_normalized=test_phone,
        clinic_id=setup_integration_data["clinic_id"],
        team_member_id=setup_integration_data["doctor_id"],
        service_id=str(setup_integration_data["service_id"]),
        preferred_date=date(2026, 9, 15),
        preferred_time="10:00",
        status="completed",
        source="call_desk",
    )
    test_session.add(prior_b)
    await test_session.commit()

    res = await client_with_db.get(
        f"/api/v1/integration/lookup?phone={test_phone}",
        headers={"X-Marlow-Key": key},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["phoneNormalized"] == test_phone
    assert data["isHeld"] is False
    assert data["patient"]["fullName"] == "Fatima Zahra"
    assert data["priorChoices"]["serviceName"] == "General Consultation"
    assert data["priorChoices"]["clinicName"] == "Main Clinic Lahore"


# ============================================================================
# 7. BOOKING CREATE, CONFLICT, RESCHEDULE, AND CANCEL PATHS
# ============================================================================

@pytest.mark.asyncio
async def test_booking_create_conflict_reschedule_cancel(setup_integration_data, client_with_db):
    """Full booking lifecycle via Integration API including 409 conflict checks."""
    key = setup_integration_data["raw_key"]

    booking_payload = {
        "patientName": "Hamza Ali",
        "patientPhone": "0300 5551234",
        "patientEmail": "hamza@example.com",
        "serviceId": str(setup_integration_data["service_id"]),
        "clinicId": str(setup_integration_data["clinic_id"]),
        "doctorId": str(setup_integration_data["doctor_id"]),
        "bookingDate": "2026-10-28",
        "bookingTime": "14:00",
        "notes": "Booked via WhatsApp bot",
        "source": "whatsapp_message",
    }

    # 1. Create Booking
    res = await client_with_db.post(
        "/api/v1/integration/bookings",
        headers={"X-Marlow-Key": key},
        json=booking_payload,
    )
    assert res.status_code == 201
    booking_data = res.json()
    assert booking_data["status"] == "confirmed"
    assert booking_data["patientPhone"] == "923005551234"
    booking_id = booking_data["id"]

    # 2. Conflict Check: Try to book exact same slot
    res_conf = await client_with_db.post(
        "/api/v1/integration/bookings",
        headers={"X-Marlow-Key": key},
        json={**booking_payload, "patientName": "Another Person"},
    )
    assert res_conf.status_code == 409
    assert "Double-booking conflict" in res_conf.json()["detail"]

    # 3. Reschedule Booking
    res_resched = await client_with_db.post(
        f"/api/v1/integration/bookings/{booking_id}/reschedule",
        headers={"X-Marlow-Key": key},
        json={"newBookingDate": "2026-10-29", "newBookingTime": "15:00"},
    )
    assert res_resched.status_code == 200
    assert res_resched.json()["bookingDate"] == "2026-10-29"
    assert res_resched.json()["bookingTime"] == "15:00"

    # 4. Confirmation Data
    res_conf_data = await client_with_db.get(
        f"/api/v1/integration/bookings/{booking_id}/confirmation-data",
        headers={"X-Marlow-Key": key},
    )
    assert res_conf_data.status_code == 200
    conf_data = res_conf_data.json()
    assert conf_data["serviceName"] == "General Consultation"
    assert conf_data["clinicName"] == "Main Clinic Lahore"
    assert "Plaza 45" in conf_data["clinicAddress"]
    assert conf_data["doctorName"] == "Dr. Sarah Tariq"
    assert conf_data["patientName"] == "Hamza Ali"

    # 5. Cancel Booking
    res_cancel = await client_with_db.post(
        f"/api/v1/integration/bookings/{booking_id}/cancel",
        headers={"X-Marlow-Key": key},
        json={"cancellationReason": "Patient requested cancellation via WhatsApp"},
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "cancelled"


# ============================================================================
# 8. UNCONFIRMED MESSAGES & AUDIT TRAIL
# ============================================================================

@pytest.mark.asyncio
async def test_unconfirmed_messages_and_audit_trail(setup_integration_data, client_with_db, test_session):
    """Test unconfirmed messages list filtering and audit activity logging."""
    key = setup_integration_data["raw_key"]

    # Create confirmed booking
    res = await client_with_db.post(
        "/api/v1/integration/bookings",
        headers={"X-Marlow-Key": key},
        json={
            "patientName": "Zainab Bibi",
            "patientPhone": "0300 9998888",
            "serviceId": str(setup_integration_data["service_id"]),
            "clinicId": str(setup_integration_data["clinic_id"]),
            "doctorId": str(setup_integration_data["doctor_id"]),
            "bookingDate": "2026-10-30",
            "bookingTime": "16:00",
        },
    )
    assert res.status_code == 201
    booking_id = res.json()["id"]

    # Query unconfirmed messages list
    res = await client_with_db.get(
        "/api/v1/integration/bookings/unconfirmed-messages",
        headers={"X-Marlow-Key": key},
    )
    assert res.status_code == 200
    unconfirmed = res.json()
    unconfirmed_ids = [b["bookingId"] for b in unconfirmed["bookings"]]
    assert booking_id in unconfirmed_ids

    # Record confirmation message for this booking
    res_msg = await client_with_db.post(
        "/api/v1/integration/messages",
        headers={"X-Marlow-Key": key},
        json={
            "direction": "outbound",
            "channel": "whatsapp",
            "purpose": "booking_confirmation",
            "recipientPhone": "03009998888",
            "body": "Your appointment is confirmed for Oct 30 at 16:00",
            "bookingId": booking_id,
        },
    )
    assert res_msg.status_code == 201

    # Query unconfirmed messages list again -> booking should be removed
    res2 = await client_with_db.get(
        "/api/v1/integration/bookings/unconfirmed-messages",
        headers={"X-Marlow-Key": key},
    )
    assert res2.status_code == 200
    unconfirmed2_ids = [b["bookingId"] for b in res2.json()["bookings"]]
    assert booking_id not in unconfirmed2_ids

    # Verify audit logs in database
    audit_stmt = select(ActivityLogORM).where(
        ActivityLogORM.entity_type == "integration_client",
        ActivityLogORM.entity_id == str(setup_integration_data["client_id"]),
    )
    audit_res = await test_session.execute(audit_stmt)
    logs = audit_res.scalars().all()
    assert len(logs) > 0
    assert logs[0].action == "integration_api_call"
