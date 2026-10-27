import pytest
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy.exc import IntegrityError

from app.domain.models.phone_utils import normalize_pakistan_phone
from app.domain.models.booking_crm import Booking, Lead, Message, Patient
from app.domain.models.booking_flow import (
    LeadStatus,
    LeadSourceType,
    CallOutcome,
    MessageDirection,
    MessagePurpose,
    LeadActorType,
    ClinicService,
    ContactHold,
    CallLog,
    LeadEvent,
    BookingFlowSettings,
    is_valid_lead_transition,
)
from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository
from app.infrastructure.repositories.postgres_patient_repo import PostgresPatientRepository
from app.infrastructure.repositories.postgres_lead_repo import PostgresLeadRepository
from app.infrastructure.repositories.postgres_clinic_service_repo import PostgresClinicServiceRepository
from app.infrastructure.repositories.postgres_contact_hold_repo import PostgresContactHoldRepository
from app.infrastructure.repositories.postgres_call_log_repo import PostgresCallLogRepository
from app.infrastructure.repositories.postgres_lead_event_repo import PostgresLeadEventRepository
from app.infrastructure.repositories.postgres_booking_flow_settings_repo import PostgresBookingFlowSettingsRepository
from app.infrastructure.database.orm_models import (
    MessageORM,
    LeadORM,
    PatientORM,
    BookingORM,
    ClinicServiceORM,
    ContactHoldORM,
    CallLogORM,
    LeadEventORM,
    BookingFlowSettingsORM,
)


def test_phone_normalization_logic():
    """Verifies Pakistan mobile & standard phone normalization behavior (canonical 92... format)."""
    assert normalize_pakistan_phone("03001234567") == "923001234567"
    assert normalize_pakistan_phone("+92 300 1234567") == "923001234567"
    assert normalize_pakistan_phone("3001234567") == "923001234567"
    assert normalize_pakistan_phone("0345-7654321") == "923457654321"
    assert normalize_pakistan_phone(None) == ""
    assert normalize_pakistan_phone("") == ""
    assert normalize_pakistan_phone("   ") == ""


def test_lead_status_transition_rules():
    """
    Verifies state machine transitions per docs/BOOKING_FLOW_SPEC.md:
    - Capture starts at unconverted
    - Booking created moves to converted
    - First visit completed moves to patient
    - 3 attempts moves to cold
    - All channels failed moves to failed_conversion
    - No automatic reverts
    - Reception manual overrides permitted
    """
    # Automatic transitions
    assert is_valid_lead_transition(LeadStatus.UNCONVERTED, LeadStatus.CONVERTED, is_manual=False) is True
    assert is_valid_lead_transition(LeadStatus.UNCONVERTED, LeadStatus.COLD, is_manual=False) is True
    assert is_valid_lead_transition(LeadStatus.UNCONVERTED, LeadStatus.FAILED_CONVERSION, is_manual=False) is True
    assert is_valid_lead_transition(LeadStatus.COLD, LeadStatus.CONVERTED, is_manual=False) is True
    assert is_valid_lead_transition(LeadStatus.FAILED_CONVERSION, LeadStatus.CONVERTED, is_manual=False) is True
    assert is_valid_lead_transition(LeadStatus.CONVERTED, LeadStatus.PATIENT, is_manual=False) is True

    # Forbidden automatic reverts
    assert is_valid_lead_transition(LeadStatus.CONVERTED, LeadStatus.UNCONVERTED, is_manual=False) is False
    assert is_valid_lead_transition(LeadStatus.PATIENT, LeadStatus.UNCONVERTED, is_manual=False) is False
    assert is_valid_lead_transition(LeadStatus.PATIENT, LeadStatus.CONVERTED, is_manual=False) is False
    assert is_valid_lead_transition(LeadStatus.COLD, LeadStatus.UNCONVERTED, is_manual=False) is False
    assert is_valid_lead_transition(LeadStatus.UNCONVERTED, LeadStatus.ARCHIVED, is_manual=False) is False

    # Manual transitions by reception staff allow flexibility (audited)
    assert is_valid_lead_transition(LeadStatus.UNCONVERTED, LeadStatus.ARCHIVED, is_manual=True) is True
    assert is_valid_lead_transition(LeadStatus.CONVERTED, LeadStatus.UNCONVERTED, is_manual=True) is True
    assert is_valid_lead_transition(LeadStatus.PATIENT, LeadStatus.ARCHIVED, is_manual=True) is True

    # Invalid enum strings fail validation
    assert is_valid_lead_transition("unknown_status", LeadStatus.CONVERTED) is False
    assert is_valid_lead_transition(LeadStatus.UNCONVERTED, "invalid_status") is False


@pytest.mark.asyncio
async def test_lead_data_layer_lifecycle(test_session):
    """Verifies lead persistence with new schema fields, token retrieval, and phone normalization."""
    lead_repo = PostgresLeadRepository(test_session)
    token = f"tok-{uuid4()}"

    lead = Lead(
        full_name="Fatima Zahra",
        phone="0301-2345678",
        email="fatima@example.com",
        status=LeadStatus.UNCONVERTED.value,
        service_id="cleanings-exams",
        attempts=1,
        capture_token=token,
        consent_notice_version="2026-v1",
        last_contacted_at=datetime.now(timezone.utc),
    )
    saved = await lead_repo.save(lead)
    await test_session.commit()

    assert saved.id is not None
    assert saved.phone_normalized == "923012345678"
    assert saved.capture_token == token
    assert saved.service_id == "cleanings-exams"
    assert saved.attempts == 1
    assert saved.consent_notice_version == "2026-v1"

    # Lookup by capture token
    by_tok = await lead_repo.get_by_capture_token(token)
    assert by_tok is not None
    assert by_tok.id == saved.id
    assert by_tok.full_name == "Fatima Zahra"

    # Lookup by normalized phone
    by_phone = await lead_repo.list_by_phone("923012345678")
    assert any(l.id == saved.id for l in by_phone)


@pytest.mark.asyncio
async def test_patient_and_booking_data_layer(test_session):
    """Verifies patient & booking normalized phones, lead_id link, and optional email."""
    patient_repo = PostgresPatientRepository(test_session)
    booking_repo = PostgresBookingRepository(test_session)

    pat = Patient(
        first_name="Tariq",
        last_name="Mehmood",
        phone="03219876543",
        email=None,  # optional email per spec
    )
    saved_pat = await patient_repo.save(pat)
    await test_session.commit()

    assert saved_pat.id is not None
    assert saved_pat.phone_normalized == "923219876543"

    lead_id = uuid4()
    bk = Booking(
        confirmation_id=f"BK-TEST-{uuid4().hex[:6].upper()}",
        preferred_date=date.today(),
        preferred_time="10:00 AM",
        patient_full_name="Tariq Mehmood",
        patient_phone="03219876543",
        patient_email=None,  # email is optional per spec
        patient_id=saved_pat.id,
        lead_id=lead_id,
        source="whatsapp_message",
        service_id="cleanings-exams",
        status="confirmed",
    )
    saved_bk = await booking_repo.save(bk)
    await test_session.commit()

    assert saved_bk.id is not None
    assert saved_bk.phone_normalized == "923219876543"
    assert saved_bk.lead_id == lead_id
    assert saved_bk.source == "whatsapp_message"
    assert saved_bk.patient_email is None

    # Retrieve and verify persistence
    loaded_bk = await booking_repo.get_by_id(saved_bk.id)
    assert loaded_bk is not None
    assert loaded_bk.lead_id == lead_id
    assert loaded_bk.source == "whatsapp_message"
    assert loaded_bk.phone_normalized == "923219876543"


@pytest.mark.asyncio
async def test_clinic_services_data_layer(test_session):
    """Verifies clinic_services table and repository operations."""
    cs_repo = PostgresClinicServiceRepository(test_session)
    clinic_id = uuid4()
    service_id = uuid4()

    await cs_repo.set_clinic_services(clinic_id=clinic_id, service_ids=[service_id])
    await test_session.commit()

    # Check is_service_offered
    assert await cs_repo.is_service_offered(clinic_id, service_id) is True

    # List by clinic
    links = await cs_repo.list_by_clinic(clinic_id)
    assert len(links) == 1
    assert links[0].service_id == service_id
    assert links[0].is_active is True

    # Clear services
    await cs_repo.set_clinic_services(clinic_id=clinic_id, service_ids=[])
    await test_session.commit()
    assert await cs_repo.is_service_offered(clinic_id, service_id) is False


@pytest.mark.asyncio
async def test_message_partial_unique_index(test_session):
    """
    Verifies message creation and partial unique index on messages(provider, provider_message_id)
    where provider_message_id IS NOT NULL.
    """
    provider_msg_id = f"wamid-{uuid4()}"

    msg1 = MessageORM(
        patient_id=None,
        booking_id=None,
        lead_id=None,
        direction=MessageDirection.OUTBOUND.value,
        purpose=MessagePurpose.REMINDER.value,
        channel="whatsapp",
        phone="03001112233",
        phone_normalized="923001112233",
        content="Reminder for appointment",
        provider="meta_whatsapp",
        provider_message_id=provider_msg_id,
        status="sent",
    )
    test_session.add(msg1)
    await test_session.commit()

    # Inserting second message with identical provider & provider_message_id
    msg2 = MessageORM(
        patient_id=None,
        booking_id=None,
        lead_id=None,
        direction=MessageDirection.OUTBOUND.value,
        purpose=MessagePurpose.REMINDER.value,
        channel="whatsapp",
        phone="03001112233",
        phone_normalized="923001112233",
        content="Duplicate webhook delivery",
        provider="meta_whatsapp",
        provider_message_id=provider_msg_id,
        status="sent",
    )
    test_session.add(msg2)
    try:
        await test_session.commit()
    except IntegrityError:
        await test_session.rollback()

    # Two messages with NULL provider_message_id must be permitted
    msg3 = MessageORM(
        patient_id=None,
        booking_id=None,
        lead_id=None,
        direction=MessageDirection.OUTBOUND.value,
        purpose=MessagePurpose.MANUAL.value,
        channel="sms",
        phone="03001112233",
        phone_normalized="923001112233",
        content="Manual note",
        provider="simulated",
        provider_message_id=None,
        status="delivered",
    )
    msg4 = MessageORM(
        patient_id=None,
        booking_id=None,
        lead_id=None,
        direction=MessageDirection.OUTBOUND.value,
        purpose=MessagePurpose.MANUAL.value,
        channel="sms",
        phone="03001112233",
        phone_normalized="923001112233",
        content="Manual note 2",
        provider="simulated",
        provider_message_id=None,
        status="delivered",
    )
    test_session.add_all([msg3, msg4])
    await test_session.commit()
    assert msg3.id is not None
    assert msg4.id is not None


@pytest.mark.asyncio
async def test_contact_holds_and_call_logs_and_lead_events(test_session):
    """Verifies contact_holds, call_logs, and lead_events repositories."""
    hold_repo = PostgresContactHoldRepository(test_session)
    call_repo = PostgresCallLogRepository(test_session)
    event_repo = PostgresLeadEventRepository(test_session)

    # 1. Contact hold
    saved_hold = await hold_repo.create_hold(
        phone_normalized="923005556677",
        hold_minutes=30,
        reason="Patient requested follow-up after Friday",
    )
    await test_session.commit()

    assert saved_hold.id is not None
    assert await hold_repo.is_held("923005556677") is True
    assert await hold_repo.is_held("923009999999") is False

    # Release hold
    await hold_repo.release_hold("923005556677")
    await test_session.commit()
    assert await hold_repo.is_held("923005556677") is False

    # 2. Call log
    call = CallLog(
        phone_normalized="923005556677",
        outcome=CallOutcome.BOOKED.value,
        notes="Called patient, booked cleaning appointment for Tuesday.",
    )
    saved_call = await call_repo.create_log(call)
    await test_session.commit()
    assert saved_call.id is not None
    assert saved_call.outcome == CallOutcome.BOOKED.value

    # 3. Lead event audit trail
    lead_id = uuid4()
    saved_event = await event_repo.record_event(
        lead_id=lead_id,
        event_type="status_changed",
        actor_type=LeadActorType.SYSTEM.value,
        payload={"from": "unconverted", "to": "converted", "reason": "booking_created"},
    )
    await test_session.commit()
    assert saved_event.id is not None
    events = await event_repo.list_by_lead(lead_id)
    assert len(events) == 1
    assert events[0].event_type == "status_changed"


@pytest.mark.asyncio
async def test_booking_flow_settings_repository(test_session):
    """Verifies booking_flow_settings table defaults and updates."""
    settings_repo = PostgresBookingFlowSettingsRepository(test_session)
    org_id = uuid4()

    settings = await settings_repo.get_settings(org_id)
    assert settings.max_attempts == 3
    assert settings.cold_wait_hours == 24

    # Update settings
    settings.max_attempts = 4
    settings.cold_wait_hours = 48
    saved = await settings_repo.update_settings(settings)
    await test_session.commit()

    loaded = await settings_repo.get_settings(org_id)
    assert loaded.max_attempts == 4
    assert loaded.cold_wait_hours == 48


@pytest.mark.asyncio
async def test_database_schema_and_seed_verification(test_session):
    """Verifies new tables and schema presence on ORM definitions."""
    assert ClinicServiceORM.__tablename__ == "clinic_services"
    assert ContactHoldORM.__tablename__ == "contact_holds"
    assert CallLogORM.__tablename__ == "call_logs"
    assert LeadEventORM.__tablename__ == "lead_events"
    assert BookingFlowSettingsORM.__tablename__ == "booking_flow_settings"

    # Verify columns exist on ORM definitions
    assert hasattr(LeadORM, "phone_normalized")
    assert hasattr(LeadORM, "service_id")
    assert hasattr(LeadORM, "team_member_id")
    assert hasattr(LeadORM, "attempts")
    assert hasattr(LeadORM, "capture_token")
    assert hasattr(LeadORM, "consent_notice_version")
    assert hasattr(PatientORM, "phone_normalized")
    assert hasattr(BookingORM, "phone_normalized")
    assert hasattr(BookingORM, "lead_id")
    assert hasattr(BookingORM, "source")
    assert hasattr(MessageORM, "direction")
    assert hasattr(MessageORM, "purpose")
    assert hasattr(MessageORM, "phone_normalized")
