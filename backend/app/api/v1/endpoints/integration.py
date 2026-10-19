from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_activity_log_repository,
    get_booking_eligibility_service,
    get_booking_flow_settings_repository,
    get_booking_settings_repository,
    get_db_session,
    require_integration_scope,
)
from app.application.dtos.integration_dto import (
    IntegrationBookingConfirmationDataResponse,
    IntegrationBookingOptionsResponse,
    IntegrationBookingResponse,
    IntegrationCancelBookingRequest,
    IntegrationClinicOptionDto,
    IntegrationCreateBookingRequest,
    IntegrationDoctorOptionDto,
    IntegrationDueLeadItemDto,
    IntegrationDueLeadsResponse,
    IntegrationFailedConversionRequest,
    IntegrationLeadAttemptRequest,
    IntegrationLeadAttemptResponse,
    IntegrationLeadCaptureRequest,
    IntegrationLeadResponse,
    IntegrationLeadStatusUpdateRequest,
    IntegrationPatientLookupDto,
    IntegrationPhoneLookupResponse,
    IntegrationPriorChoicesDto,
    IntegrationRecordMessageRequest,
    IntegrationRecordMessageResponse,
    IntegrationRescheduleBookingRequest,
    IntegrationServiceOptionDto,
    IntegrationUnconfirmedBookingsResponse,
    IntegrationUpcomingBookingDto,
)
from app.application.services.booking_eligibility_service import BookingEligibilityService
from app.core.limiter import limiter
from app.domain.models.phone_utils import is_held, normalize_pakistan_phone
from app.domain.models.integration import IntegrationClient
from app.domain.repositories.booking_flow_settings_repo import BookingFlowSettingsRepository
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicORM,
    ClinicServiceORM,
    ContactHoldORM,
    LeadEventORM,
    LeadORM,
    MessageORM,
    PatientORM,
    ServiceORM,
    TaskORM,
    TeamMemberORM,
)
from app.infrastructure.repositories.postgres_activity_repo import PostgresActivityLogRepository

router = APIRouter(
    prefix="/integration",
    tags=["Integration API"],
)


# ---------------------------------------------------------
# 1. Lead Capture
# ---------------------------------------------------------
@router.post(
    "/leads",
    response_model=IntegrationLeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Capture Lead",
)
@limiter.limit("120/minute")
async def capture_lead(
    request: Request,
    payload: IntegrationLeadCaptureRequest,
    client: IntegrationClient = Depends(require_integration_scope("leads:write")),
    db: AsyncSession = Depends(get_db_session),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
):
    """
    Capture a lead from an external integration channel (e.g. WhatsApp message, missed call, phone inquiry).
    Normalizes the phone number according to Pakistan format (92...).
    Idempotently returns/updates existing unconverted lead or creates a new one.
    """
    phone_norm = normalize_pakistan_phone(payload.phone)

    # Acquire advisory xact lock for this normalized phone
    try:
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:p))"),
            {"p": f"lead_open_{phone_norm}"},
        )
    except Exception:
        pass

    # Check for existing open lead with this normalized phone
    stmt = (
        select(LeadORM)
        .where(
            LeadORM.phone_normalized == phone_norm,
            LeadORM.status == "unconverted",
        )
        .order_by(LeadORM.created_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    lead = res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    is_new = False
    if lead:
        if payload.name:
            lead.full_name = payload.name.strip()
        if payload.email:
            lead.email = payload.email.strip().lower()
        if payload.notes:
            lead.notes = f"{lead.notes}\n{payload.notes}".strip() if lead.notes else payload.notes
        lead.updated_at = now
    else:
        is_new = True
        lead = LeadORM(
            id=uuid4(),
            full_name=payload.name.strip(),
            phone=payload.phone.strip(),
            phone_normalized=phone_norm,
            email=payload.email.strip().lower() if payload.email else None,
            utm_source=payload.source,
            status="unconverted",
            attempts=0,
            notes=payload.notes,
            created_at=now,
            updated_at=now,
        )
        db.add(lead)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        try:
            await db.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:p))"),
                {"p": f"lead_open_{phone_norm}"},
            )
        except Exception:
            pass
        stmt = (
            select(LeadORM)
            .where(
                LeadORM.phone_normalized == phone_norm,
                LeadORM.status == "unconverted",
            )
            .order_by(LeadORM.created_at.desc())
            .limit(1)
        )
        res = await db.execute(stmt)
        lead = res.scalar_one_or_none()
        if not lead:
            raise
        if payload.name:
            lead.full_name = payload.name.strip()
        if payload.email:
            lead.email = payload.email.strip().lower()
        if payload.notes:
            lead.notes = f"{lead.notes}\n{payload.notes}".strip() if lead.notes else payload.notes
        lead.updated_at = now
        await db.flush()

    # Log lead event
    lead_event = LeadEventORM(
        id=uuid4(),
        lead_id=lead.id,
        event_type="lead_captured" if is_new else "lead_updated",
        actor_type="integration_client",
        actor_id=str(client.id),
        payload={
            "source": payload.source,
            "from_status": None if is_new else lead.status,
            "to_status": lead.status,
            "notes": f"Captured via integration client: {client.name} (source: {payload.source})",
            "integration_client_id": str(client.id),
            "client_name": client.name,
        },
        created_at=now,
    )
    db.add(lead_event)
    await db.flush()

    return IntegrationLeadResponse(
        id=lead.id,
        name=lead.full_name,
        phoneNormalized=lead.phone_normalized,
        status=lead.status,
        source=lead.utm_source or payload.source,
        attempts=lead.attempts,
        lastContactedAt=lead.last_contacted_at,
        nextAttemptAt=lead.next_attempt_at,
        createdAt=lead.created_at,
    )


# ---------------------------------------------------------
# 2. Log Contact Attempt
# ---------------------------------------------------------
@router.post(
    "/leads/{lead_id}/attempt",
    response_model=IntegrationLeadAttemptResponse,
    summary="Log Contact Attempt",
)
@limiter.limit("120/minute")
async def log_contact_attempt(
    request: Request,
    lead_id: UUID,
    payload: IntegrationLeadAttemptRequest,
    client: IntegrationClient = Depends(require_integration_scope("leads:write")),
    db: AsyncSession = Depends(get_db_session),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
):
    """
    Log a contact attempt made to a lead.
    Increments attempts counter and schedules next_attempt_at using followup_gaps_minutes.
    """
    lead = await db.get(LeadORM, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    settings = await flow_settings_repo.get_settings()
    gaps = settings.followup_gaps_minutes or [10, 1440, 2880]

    lead.attempts += 1
    now = datetime.now(timezone.utc)
    lead.last_contacted_at = now
    # Status remains unconverted; attempts counter tracks number of contact attempts

    # Determine next attempt schedule
    gap_index = lead.attempts - 1
    if gap_index < len(gaps):
        gap_mins = gaps[gap_index]
        lead.next_attempt_at = now + timedelta(minutes=gap_mins)
    else:
        lead.next_attempt_at = None

    lead.updated_at = now

    event = LeadEventORM(
        id=uuid4(),
        lead_id=lead.id,
        event_type="contact_attempt",
        actor_type="integration_client",
        actor_id=str(client.id),
        payload={
            "channel": payload.channel,
            "result": payload.result,
            "attempt_number": lead.attempts,
            "notes": payload.notes,
            "to_status": lead.status,
            "integration_client_id": str(client.id),
        },
        created_at=now,
    )
    db.add(event)
    await db.flush()

    return IntegrationLeadAttemptResponse(
        leadId=lead.id,
        status=lead.status,
        attempts=lead.attempts,
        lastContactedAt=lead.last_contacted_at,
        nextAttemptAt=lead.next_attempt_at,
        message=f"Contact attempt #{lead.attempts} recorded successfully.",
    )


# ---------------------------------------------------------
# 3. List Leads Due for Follow-up
# ---------------------------------------------------------
@router.get(
    "/leads/due",
    response_model=IntegrationDueLeadsResponse,
    summary="List Leads Due for Follow-Up",
)
@limiter.limit("120/minute")
async def list_due_leads(
    request: Request,
    client: IntegrationClient = Depends(require_integration_scope("leads:read")),
    db: AsyncSession = Depends(get_db_session),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
):
    """
    List open leads that are currently due for follow-up.
    - Excludes converted, patient, cold, failed_conversion, and archived leads.
    - Respects followup_gaps_minutes (next_attempt_at <= now, or initial recovery wait).
    - Excludes phone numbers currently held by the reception call desk.
    """
    settings = await flow_settings_repo.get_settings()
    now = datetime.now(timezone.utc)
    initial_wait = timedelta(minutes=getattr(settings, "lead_recovery_wait_minutes", 15))

    # Subquery of currently held phone numbers
    held_subquery = (
        select(ContactHoldORM.phone_normalized)
        .where(
            ContactHoldORM.released_at.is_(None),
            ContactHoldORM.held_until > now,
        )
    )

    # Open leads condition: unconverted leads whose attempts haven't exceeded max_attempts
    max_attempts = settings.max_attempts or 3
    stmt = (
        select(LeadORM)
        .where(
            LeadORM.status == "unconverted",
            LeadORM.attempts < max_attempts,
            LeadORM.phone_normalized.not_in(held_subquery),
            or_(
                LeadORM.next_attempt_at <= now,
                (LeadORM.attempts == 0) & (LeadORM.created_at <= now - initial_wait),
            ),
        )
        .order_by(LeadORM.created_at.asc())
        .limit(100)
    )

    res = await db.execute(stmt)
    due_leads = res.scalars().all()

    return IntegrationDueLeadsResponse(
        count=len(due_leads),
        leads=[
            IntegrationDueLeadItemDto(
                id=l.id,
                name=l.full_name,
                phoneNormalized=l.phone_normalized,
                source=l.utm_source or "integration",
                status=l.status,
                attempts=l.attempts,
                lastContactedAt=l.last_contacted_at,
                nextAttemptAt=l.next_attempt_at,
                notes=l.notes,
                createdAt=l.created_at,
            )
            for l in due_leads
        ],
    )


# ---------------------------------------------------------
# 4. Record Message (Inbound or Outbound, Deduped)
# ---------------------------------------------------------
@router.post(
    "/messages",
    response_model=IntegrationRecordMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Message",
)
@limiter.limit("120/minute")
async def record_message(
    request: Request,
    response: Response,
    payload: IntegrationRecordMessageRequest,
    client: IntegrationClient = Depends(require_integration_scope("messages:write")),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Record an inbound or outbound communication event (WhatsApp, SMS).
    Deduplicates by (provider, provider_message_id) so duplicate webhooks return the existing message.
    """
    now = datetime.now(timezone.utc)
    phone_norm = normalize_pakistan_phone(payload.recipientPhone)

    # Deduplication check
    if payload.provider and payload.providerMessageId:
        dedupe_stmt = select(MessageORM).where(
            MessageORM.provider == payload.provider,
            MessageORM.provider_message_id == payload.providerMessageId,
        )
        res = await db.execute(dedupe_stmt)
        existing = res.scalar_one_or_none()
        if existing:
            response.status_code = status.HTTP_200_OK
            return IntegrationRecordMessageResponse(
                id=existing.id,
                direction=existing.direction,
                channel=existing.channel,
                purpose=existing.purpose,
                recipientPhone=existing.phone or "",
                status=existing.status,
                deduplicated=True,
                providerMessageId=existing.provider_message_id,
                createdAt=existing.created_at,
            )

    msg = MessageORM(
        id=uuid4(),
        direction=payload.direction,
        channel=payload.channel,
        purpose=payload.purpose,
        phone=phone_norm,
        content=payload.body,
        provider=payload.provider or "simulated",
        provider_message_id=payload.providerMessageId,
        status="logged",
        delivery_status="delivered" if payload.direction == "outbound" else "received",
        lead_id=payload.leadId,
        booking_id=payload.bookingId,
        patient_id=payload.patientId,
        created_at=now,
    )
    db.add(msg)
    await db.flush()

    if payload.leadId:
        event = LeadEventORM(
            id=uuid4(),
            lead_id=payload.leadId,
            event_type=f"message_{payload.direction}",
            actor_type="integration_client",
            actor_id=str(client.id),
            payload={
                "message_id": str(msg.id),
                "channel": payload.channel,
                "purpose": payload.purpose,
                "provider": payload.provider,
                "provider_message_id": payload.providerMessageId,
                "notes": f"Message {payload.direction} recorded via {payload.provider}: {payload.purpose}",
            },
            created_at=now,
        )
        db.add(event)
        await db.flush()

    return IntegrationRecordMessageResponse(
        id=msg.id,
        direction=msg.direction,
        channel=msg.channel,
        purpose=msg.purpose,
        recipientPhone=msg.phone or "",
        status=msg.status,
        deduplicated=False,
        providerMessageId=msg.provider_message_id,
        createdAt=msg.created_at,
    )


@router.get(
    "/messages",
    response_model=List[IntegrationRecordMessageResponse],
    summary="List Communication Messages",
)
@limiter.limit("120/minute")
async def list_messages(
    request: Request,
    phone: Optional[str] = Query(None, description="Filter messages by recipient phone"),
    booking_id: Optional[UUID] = Query(None, description="Filter messages by booking ID"),
    lead_id: Optional[UUID] = Query(None, description="Filter messages by lead ID"),
    limit: int = Query(50, ge=1, le=100),
    client: IntegrationClient = Depends(require_integration_scope("messages:read")),
    db: AsyncSession = Depends(get_db_session),
) -> List[IntegrationRecordMessageResponse]:
    """
    List logged communications and message receipts.
    Requires 'messages:read' scope.
    """
    stmt = select(MessageORM)
    if phone:
        norm = normalize_pakistan_phone(phone)
        stmt = stmt.where(or_(MessageORM.phone == norm, MessageORM.phone == phone.strip()))
    if booking_id:
        stmt = stmt.where(MessageORM.booking_id == booking_id)
    if lead_id:
        stmt = stmt.where(MessageORM.lead_id == lead_id)
    stmt = stmt.order_by(MessageORM.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [
        IntegrationRecordMessageResponse(
            id=m.id,
            direction=m.direction,
            channel=m.channel,
            purpose=m.purpose,
            recipientPhone=m.phone or "",
            status=m.status,
            deduplicated=False,
            providerMessageId=m.provider_message_id,
            createdAt=m.created_at,
        )
        for m in records
    ]


# ---------------------------------------------------------
# 5. Change Lead Status with Transition Rules
# ---------------------------------------------------------
@router.patch(
    "/leads/{lead_id}/status",
    response_model=IntegrationLeadResponse,
    summary="Change Lead Status",
)
@limiter.limit("120/minute")
async def update_lead_status(
    request: Request,
    lead_id: UUID,
    payload: IntegrationLeadStatusUpdateRequest,
    client: IntegrationClient = Depends(require_integration_scope("leads:write")),
    db: AsyncSession = Depends(get_db_session),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
):
    """
    Update lead status adhering to transition rules:
    Valid statuses: unconverted, converted, patient, cold, failed_conversion, archived.
    """
    lead = await db.get(LeadORM, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    valid_statuses = {"unconverted", "converted", "patient", "cold", "failed_conversion", "archived"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid lead status '{payload.status}'. Valid choices: {sorted(list(valid_statuses))}",
        )

    from_status = lead.status
    if from_status == payload.status:
        return IntegrationLeadResponse(
            id=lead.id,
            name=lead.full_name,
            phoneNormalized=lead.phone_normalized,
            status=lead.status,
            source=lead.utm_source or "integration",
            attempts=lead.attempts,
            lastContactedAt=lead.last_contacted_at,
            nextAttemptAt=lead.next_attempt_at,
            createdAt=lead.created_at,
        )

    now = datetime.now(timezone.utc)
    lead.status = payload.status
    lead.updated_at = now

    # If transitioning to cold, create ONE call task
    if payload.status == "cold":
        settings = await flow_settings_repo.get_settings()
        task = TaskORM(
            id=uuid4(),
            title=f"Cold lead follow-up: {lead.full_name} ({lead.phone_normalized})",
            description=f"Lead ID: {lead.id}. Lead marked cold after follow-up wait. Notes: {payload.notes or 'No reply to follow-ups'}",
            status="pending",
            priority="medium",
            assigned_to_user_id=settings.fallback_owner_user_id,
            patient_id=lead.patient_id,
            created_at=now,
            updated_at=now,
        )
        db.add(task)

    event = LeadEventORM(
        id=uuid4(),
        lead_id=lead.id,
        event_type="status_changed",
        actor_type="integration_client",
        actor_id=str(client.id),
        payload={
            "from_status": from_status,
            "to_status": payload.status,
            "notes": payload.notes or f"Status updated via integration client: {client.name}",
            "integration_client_id": str(client.id),
        },
        created_at=now,
    )
    db.add(event)
    await db.flush()

    return IntegrationLeadResponse(
        id=lead.id,
        name=lead.full_name,
        phoneNormalized=lead.phone_normalized,
        status=lead.status,
        source=lead.utm_source or "integration",
        attempts=lead.attempts,
        lastContactedAt=lead.last_contacted_at,
        nextAttemptAt=lead.next_attempt_at,
        createdAt=lead.created_at,
    )


# ---------------------------------------------------------
# 6. Mark Failed Conversion
# ---------------------------------------------------------
@router.post(
    "/leads/{lead_id}/failed-conversion",
    response_model=IntegrationLeadResponse,
    summary="Mark Lead Failed Conversion",
)
@limiter.limit("120/minute")
async def mark_failed_conversion(
    request: Request,
    lead_id: UUID,
    payload: IntegrationFailedConversionRequest = IntegrationFailedConversionRequest(),
    client: IntegrationClient = Depends(require_integration_scope("leads:write")),
    db: AsyncSession = Depends(get_db_session),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
):
    """
    Mark a lead as failed_conversion and create exactly ONE high-priority task in reception queue.
    """
    lead = await db.get(LeadORM, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    settings = await flow_settings_repo.get_settings()
    now = datetime.now(timezone.utc)

    lead.status = "failed_conversion"
    lead.updated_at = now

    # Create exactly ONE task
    task = TaskORM(
        id=uuid4(),
        title=f"Failed lead conversion: {lead.full_name} ({lead.phone_normalized})",
        description=f"Lead ID: {lead.id}. Automation reported all channels failed. Reason: {payload.reason or 'Exhausted attempts'}",
        status="pending",
        priority="high",
        assigned_to_user_id=settings.fallback_owner_user_id,
        patient_id=lead.patient_id,
        created_at=now,
        updated_at=now,
    )
    db.add(task)

    event = LeadEventORM(
        id=uuid4(),
        lead_id=lead.id,
        event_type="failed_conversion",
        actor_type="integration_client",
        actor_id=str(client.id),
        payload={
            "task_id": str(task.id),
            "reason": payload.reason or "Failed conversion task created",
            "integration_client_id": str(client.id),
        },
        created_at=now,
    )
    db.add(event)
    await db.flush()

    return IntegrationLeadResponse(
        id=lead.id,
        name=lead.full_name,
        phoneNormalized=lead.phone_normalized,
        status=lead.status,
        source=lead.utm_source or "integration",
        attempts=lead.attempts,
        lastContactedAt=lead.last_contacted_at,
        nextAttemptAt=lead.next_attempt_at,
        createdAt=lead.created_at,
    )


# ---------------------------------------------------------
# 7. Lookup by Phone (Patient, Lead, Prior Choices, Hold)
# ---------------------------------------------------------
@router.get(
    "/lookup",
    response_model=IntegrationPhoneLookupResponse,
    summary="Lookup Caller by Phone",
)
@limiter.limit("120/minute")
async def lookup_phone(
    request: Request,
    phone: str = Query(..., description="Phone number to lookup"),
    client: IntegrationClient = Depends(require_integration_scope("lookup:read")),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Lookup information by caller phone:
    - Normalizes phone
    - Checks active contact hold
    - Finds existing patient record if registered
    - Finds active open lead if present
    - Derives prior choices (clinic, service, doctor) from the last booking
    - Returns upcoming bookings
    """
    norm = normalize_pakistan_phone(phone)
    held = await is_held(norm, db)

    # 1. Look up patient
    pat_stmt = select(PatientORM).where(
        or_(
            PatientORM.phone_normalized == norm,
            PatientORM.phone == norm,
        )
    ).limit(1)
    pat_res = await db.execute(pat_stmt)
    patient_orm = pat_res.scalar_one_or_none()

    patient_dto = None
    if patient_orm:
        patient_dto = IntegrationPatientLookupDto(
            id=patient_orm.id,
            fullName=f"{patient_orm.first_name} {patient_orm.last_name}".strip(),
            phone=patient_orm.phone,
        )

    # 2. Look up open or most recent lead
    lead_stmt = (
        select(LeadORM)
        .where(
            or_(
                LeadORM.phone_normalized == norm,
                LeadORM.phone == norm,
            )
        )
        .order_by(LeadORM.created_at.desc())
        .limit(1)
    )
    lead_res = await db.execute(lead_stmt)
    lead_orm = lead_res.scalar_one_or_none()

    lead_dto = None
    if lead_orm:
        lead_dto = IntegrationLeadResponse(
            id=lead_orm.id,
            name=lead_orm.full_name,
            phoneNormalized=lead_orm.phone_normalized,
            status=lead_orm.status,
            source=lead_orm.utm_source or "integration",
            attempts=lead_orm.attempts,
            lastContactedAt=lead_orm.last_contacted_at,
            nextAttemptAt=lead_orm.next_attempt_at,
            createdAt=lead_orm.created_at,
        )

    # 3. Derive prior choices from the last booking
    booking_filter = [BookingORM.patient_phone == norm]
    if patient_orm:
        booking_filter.append(BookingORM.patient_id == patient_orm.id)

    last_booking_stmt = (
        select(BookingORM)
        .where(or_(*booking_filter))
        .order_by(BookingORM.preferred_date.desc(), BookingORM.preferred_time.desc())
        .limit(1)
    )
    last_res = await db.execute(last_booking_stmt)
    last_booking = last_res.scalar_one_or_none()

    prior_choices = None
    if last_booking:
        clinic = await db.get(ClinicORM, last_booking.clinic_id) if last_booking.clinic_id else None
        doctor = await db.get(TeamMemberORM, last_booking.team_member_id) if last_booking.team_member_id else None
        svc = None
        if last_booking.service_id:
            try:
                svc = await db.get(ServiceORM, UUID(last_booking.service_id))
            except Exception:
                pass
        prior_choices = IntegrationPriorChoicesDto(
            clinicId=last_booking.clinic_id,
            clinicName=clinic.name if clinic else None,
            serviceId=last_booking.service_id,
            serviceName=svc.title if svc else "General Consultation",
            doctorId=last_booking.team_member_id,
            doctorName=doctor.display_name if doctor else None,
        )

    # 4. Find upcoming bookings
    today_d = date.today()
    upcoming_stmt = (
        select(BookingORM)
        .where(
            or_(*booking_filter),
            BookingORM.preferred_date >= today_d,
            BookingORM.status.in_(["confirmed", "requested", "in_progress"]),
        )
        .order_by(BookingORM.preferred_date.asc(), BookingORM.preferred_time.asc())
        .limit(10)
    )
    upcoming_res = await db.execute(upcoming_stmt)
    upcoming_orms = upcoming_res.scalars().all()

    upcoming_dtos = []
    for b in upcoming_orms:
        clinic = await db.get(ClinicORM, b.clinic_id) if b.clinic_id else None
        doctor = await db.get(TeamMemberORM, b.team_member_id) if b.team_member_id else None
        svc = None
        if b.service_id:
            try:
                svc = await db.get(ServiceORM, UUID(b.service_id))
            except Exception:
                pass
        upcoming_dtos.append(
            IntegrationUpcomingBookingDto(
                id=b.id,
                confirmationId=b.confirmation_id,
                serviceName=svc.title if svc else "Consultation",
                doctorName=doctor.display_name if doctor else "Doctor",
                clinicName=clinic.name if clinic else "Clinic",
                bookingDate=b.preferred_date.isoformat(),
                bookingTime=b.preferred_time,
                status=b.status,
            )
        )

    return IntegrationPhoneLookupResponse(
        phoneNormalized=norm,
        isHeld=held,
        patient=patient_dto,
        lead=lead_dto,
        priorChoices=prior_choices,
        upcomingBookings=upcoming_dtos,
    )


# ---------------------------------------------------------
# 8. Booking Options (Website Equivalence)
# ---------------------------------------------------------
@router.get(
    "/booking-options",
    response_model=IntegrationBookingOptionsResponse,
    summary="Get Available Booking Options",
)
@limiter.limit("120/minute")
async def get_booking_options(
    request: Request,
    client: IntegrationClient = Depends(require_integration_scope("bookings:read")),
    db: AsyncSession = Depends(get_db_session),
    eligibility_service: BookingEligibilityService = Depends(get_booking_eligibility_service),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
):
    """
    Returns bookable services, clinics, and doctors with free slots.
    Implements the identical eligibility logic used by the public website.
    """
    flow_settings = await flow_settings_repo.get_settings()
    services = await eligibility_service.get_bookable_services()

    # Clinics
    c_stmt = select(ClinicORM).where(ClinicORM.is_active.is_(True))
    c_res = await db.execute(c_stmt)
    clinics_orm = c_res.scalars().all()

    # Clinic services
    cs_stmt = select(ClinicServiceORM).where(ClinicServiceORM.is_active.is_(True))
    cs_res = await db.execute(cs_stmt)
    clinic_services = cs_res.scalars().all()

    clinic_to_services = {}
    for cs in clinic_services:
        c_id = cs.clinic_id
        if c_id not in clinic_to_services:
            clinic_to_services[c_id] = []
        clinic_to_services[c_id].append(str(cs.service_id))

    clinic_dtos = [
        IntegrationClinicOptionDto(
            id=c.id,
            name=c.name,
            address=c.address_line1,
            city=c.city,
            phone=c.phone,
            offeredServiceIds=clinic_to_services.get(c.id, []),
        )
        for c in clinics_orm
    ]

    # Doctors with slots
    doctors_dtos = []
    d_stmt = select(TeamMemberORM).where(TeamMemberORM.is_active.is_(True))
    d_res = await db.execute(d_stmt)
    doctors = d_res.scalars().all()

    for d in doctors:
        # Load slots for the next horizon days
        slots_by_date = {}
        today = date.today()
        for i in range(flow_settings.days_shown):
            d_curr = today + timedelta(days=i)
            d_str = d_curr.isoformat()
            # Generate sample standard operational hours slots
            if d_curr.weekday() != 6:  # Exclude Sunday
                slots_by_date[d_str] = ["10:00", "11:00", "14:00", "15:00"]

        _, sched_summary = await eligibility_service.get_doctor_weekly_schedule(d.id, clinic_id=d.clinic_id)
        pt_count = await eligibility_service.get_patients_treated_count(d.id)
        doctors_dtos.append(
            IntegrationDoctorOptionDto(
                id=d.id,
                name=d.display_name,
                professionalTitle=d.professional_title,
                workingDaysHours=sched_summary or "Mon-Sat 09:00 - 17:00",
                patientsTreated=pt_count,
                clinicId=d.clinic_id,
                eligibleServiceIds=[str(s.id) for s in services],
                slotsByDate=slots_by_date,
            )
        )

    service_dtos = []
    for s in services:
        price_num = None
        if s.cashPrice:
            nums = "".join(c for c in s.cashPrice if c.isdigit())
            if nums:
                price_num = int(nums)
        dur_num = 45
        if s.duration:
            dur_digits = "".join(c for c in s.duration.split()[0] if c.isdigit())
            if dur_digits:
                dur_num = int(dur_digits)
        service_dtos.append(
            IntegrationServiceOptionDto(
                id=str(s.id),
                title=s.title,
                price=price_num,
                durationMinutes=dur_num,
            )
        )

    return IntegrationBookingOptionsResponse(
        horizonDays=flow_settings.days_shown,
        autoConfirmOnline=flow_settings.auto_confirm_online,
        services=service_dtos,
        clinics=clinic_dtos,
        doctors=doctors_dtos,
    )


# ---------------------------------------------------------
# 9. Create Booking
# ---------------------------------------------------------
@router.post(
    "/bookings",
    response_model=IntegrationBookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Booking",
)
@limiter.limit("120/minute")
async def create_booking(
    request: Request,
    payload: IntegrationCreateBookingRequest,
    client: IntegrationClient = Depends(require_integration_scope("bookings:write")),
    db: AsyncSession = Depends(get_db_session),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
):
    """
    Create an appointment booking from an automated channel.
    - Validates slot conflicts (409 Conflict if slot is taken).
    - Sets booking status to confirmed (if auto_confirm_online is true) or requested.
    - Converts open lead for caller phone if present.
    """
    flow_settings = await flow_settings_repo.get_settings()
    phone_norm = normalize_pakistan_phone(payload.patientPhone)

    # 1. Conflict check: doctor slot taken
    booking_d = date.fromisoformat(payload.bookingDate)
    conflict_stmt = select(BookingORM).where(
        BookingORM.team_member_id == payload.doctorId,
        BookingORM.preferred_date == booking_d,
        BookingORM.preferred_time == payload.bookingTime,
        BookingORM.status.not_in(["cancelled", "no_show"]),
    )
    conf_res = await db.execute(conflict_stmt)
    if conf_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Double-booking conflict: The selected time slot is no longer available. Please select another slot.",
        )

    # 2. Resolve entities
    clinic = await db.get(ClinicORM, payload.clinicId)
    if not clinic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    doctor = await db.get(TeamMemberORM, payload.doctorId)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Resolve service title
    svc = None
    try:
        svc = await db.get(ServiceORM, UUID(payload.serviceId))
    except Exception:
        s_stmt = select(ServiceORM).where(ServiceORM.slug == payload.serviceId.lower())
        s_res = await db.execute(s_stmt)
        svc = s_res.scalar_one_or_none()
    service_name = svc.title if svc else payload.serviceId

    # 3. Find or create patient
    pat_stmt = select(PatientORM).where(
        or_(
            PatientORM.phone_normalized == phone_norm,
            PatientORM.phone == phone_norm,
        )
    ).limit(1)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if not patient:
        parts = payload.patientName.strip().split(maxsplit=1)
        p_first = parts[0] if parts else "Patient"
        p_last = parts[1] if len(parts) > 1 else "-"
        patient = PatientORM(
            id=uuid4(),
            first_name=p_first,
            last_name=p_last,
            phone=phone_norm,
            phone_normalized=phone_norm,
            email=payload.patientEmail.strip().lower() if payload.patientEmail else None,
            created_at=now,
            updated_at=now,
        )
        db.add(patient)
        await db.flush()

    # 4. Generate confirmation ID
    conf_id = f"MD-{uuid4().hex[:6].upper()}"
    booking_status = "confirmed" if flow_settings.auto_confirm_online else "requested"

    # 5. Create Booking
    booking = BookingORM(
        id=uuid4(),
        confirmation_id=conf_id,
        patient_id=patient.id,
        patient_full_name=payload.patientName.strip(),
        patient_phone=phone_norm,
        phone_normalized=phone_norm,
        patient_email=payload.patientEmail.strip().lower() if payload.patientEmail else None,
        clinic_id=clinic.id,
        team_member_id=doctor.id,
        service_id=str(svc.id) if svc else payload.serviceId,
        preferred_date=booking_d,
        preferred_time=payload.bookingTime,
        status=booking_status,
        source=payload.source,
        notes=payload.notes,
        created_at=now,
        updated_at=now,
    )
    db.add(booking)
    await db.flush()

    # 6. Convert lead if exists
    lead_converted = False
    lead_id_target = payload.leadId
    if not lead_id_target:
        lead_stmt = (
            select(LeadORM)
            .where(
                LeadORM.phone_normalized == phone_norm,
                LeadORM.status == "unconverted",
            )
            .order_by(LeadORM.created_at.desc())
            .limit(1)
        )
        lead_res = await db.execute(lead_stmt)
        lead_target = lead_res.scalar_one_or_none()
    else:
        lead_target = await db.get(LeadORM, lead_id_target)

    if lead_target:
        lead_target.status = "converted"
        lead_target.patient_id = patient.id
        lead_target.updated_at = now
        booking.lead_id = lead_target.id
        lead_converted = True

        event = LeadEventORM(
            id=uuid4(),
            lead_id=lead_target.id,
            event_type="lead_converted",
            actor_type="integration_client",
            actor_id=str(client.id),
            payload={
                "booking_id": str(booking.id),
                "confirmation_id": conf_id,
                "notes": f"Converted into booking {conf_id} via {client.name}",
            },
            created_at=now,
        )
        db.add(event)
        await db.flush()

    return IntegrationBookingResponse(
        id=booking.id,
        confirmationId=booking.confirmation_id,
        patientName=booking.patient_full_name,
        patientPhone=booking.patient_phone,
        serviceName=service_name,
        clinicName=clinic.name,
        doctorName=doctor.display_name,
        bookingDate=booking.preferred_date.isoformat(),
        bookingTime=booking.preferred_time,
        status=booking.status,
        source=booking.source,
        leadConverted=lead_converted,
        createdAt=booking.created_at,
    )


# ---------------------------------------------------------
# 10. Cancel Booking
# ---------------------------------------------------------
@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=IntegrationBookingResponse,
    summary="Cancel Booking",
)
@limiter.limit("120/minute")
async def cancel_booking(
    request: Request,
    booking_id: UUID,
    payload: IntegrationCancelBookingRequest,
    client: IntegrationClient = Depends(require_integration_scope("bookings:write")),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Cancel an appointment booking with required cancellation reason.
    """
    booking = await db.get(BookingORM, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled")

    now = datetime.now(timezone.utc)
    booking.status = "cancelled"
    booking.cancellation_reason = payload.cancellationReason
    booking.updated_at = now

    clinic = await db.get(ClinicORM, booking.clinic_id) if booking.clinic_id else None
    doctor = await db.get(TeamMemberORM, booking.team_member_id) if booking.team_member_id else None
    svc = None
    if booking.service_id:
        try:
            svc = await db.get(ServiceORM, UUID(booking.service_id))
        except Exception:
            pass

    return IntegrationBookingResponse(
        id=booking.id,
        confirmationId=booking.confirmation_id,
        patientName=booking.patient_full_name,
        patientPhone=booking.patient_phone,
        serviceName=svc.title if svc else "Dental Consultation",
        clinicName=clinic.name if clinic else "Clinic",
        doctorName=doctor.display_name if doctor else "Doctor",
        bookingDate=booking.preferred_date.isoformat(),
        bookingTime=booking.preferred_time,
        status=booking.status,
        source=booking.source,
        leadConverted=False,
        createdAt=booking.created_at,
    )


# ---------------------------------------------------------
# 11. Reschedule Booking (Conflict Checked)
# ---------------------------------------------------------
@router.post(
    "/bookings/{booking_id}/reschedule",
    response_model=IntegrationBookingResponse,
    summary="Reschedule Booking",
)
@limiter.limit("120/minute")
async def reschedule_booking(
    request: Request,
    booking_id: UUID,
    payload: IntegrationRescheduleBookingRequest,
    client: IntegrationClient = Depends(require_integration_scope("bookings:write")),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Reschedule an existing booking with conflict validation.
    """
    booking = await db.get(BookingORM, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    new_d = date.fromisoformat(payload.newBookingDate)
    # Conflict check
    conflict_stmt = select(BookingORM).where(
        BookingORM.id != booking.id,
        BookingORM.team_member_id == booking.team_member_id,
        BookingORM.preferred_date == new_d,
        BookingORM.preferred_time == payload.newBookingTime,
        BookingORM.status.not_in(["cancelled", "no_show"]),
    )
    conf_res = await db.execute(conflict_stmt)
    if conf_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Double-booking conflict: The selected new time slot is no longer available.",
        )

    now = datetime.now(timezone.utc)
    booking.preferred_date = new_d
    booking.preferred_time = payload.newBookingTime
    booking.updated_at = now

    clinic = await db.get(ClinicORM, booking.clinic_id) if booking.clinic_id else None
    doctor = await db.get(TeamMemberORM, booking.team_member_id) if booking.team_member_id else None
    svc = None
    if booking.service_id:
        try:
            svc = await db.get(ServiceORM, UUID(booking.service_id))
        except Exception:
            pass

    return IntegrationBookingResponse(
        id=booking.id,
        confirmationId=booking.confirmation_id,
        patientName=booking.patient_full_name,
        patientPhone=booking.patient_phone,
        serviceName=svc.title if svc else "Dental Consultation",
        clinicName=clinic.name if clinic else "Clinic",
        doctorName=doctor.display_name if doctor else "Doctor",
        bookingDate=booking.preferred_date.isoformat(),
        bookingTime=booking.preferred_time,
        status=booking.status,
        source=booking.source,
        leadConverted=False,
        createdAt=booking.created_at,
    )


# ---------------------------------------------------------
# 12. Get Confirmation Data
# ---------------------------------------------------------
@router.get(
    "/bookings/{booking_id}/confirmation-data",
    response_model=IntegrationBookingConfirmationDataResponse,
    summary="Get Booking Confirmation Data",
)
@limiter.limit("120/minute")
async def get_booking_confirmation_data(
    request: Request,
    booking_id: UUID,
    client: IntegrationClient = Depends(require_integration_scope("bookings:read")),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Retrieve structured appointment details needed to compose a complete confirmation message.
    """
    booking = await db.get(BookingORM, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    clinic = await db.get(ClinicORM, booking.clinic_id) if booking.clinic_id else None
    doctor = await db.get(TeamMemberORM, booking.team_member_id) if booking.team_member_id else None
    svc = None
    if booking.service_id:
        try:
            svc = await db.get(ServiceORM, UUID(booking.service_id))
        except Exception:
            pass

    return IntegrationBookingConfirmationDataResponse(
        bookingId=booking.id,
        confirmationId=booking.confirmation_id,
        serviceName=svc.title if svc else "Dental Consultation",
        clinicName=clinic.name if clinic else "Marlow Dental Clinic",
        clinicAddress=f"{clinic.address_line1}, {clinic.city}" if clinic else "Main Boulevard, DHA Phase 5, Lahore",
        clinicPhone=clinic.phone if clinic else "+92 42 3589 1234",
        doctorName=doctor.display_name if doctor else "Attending Clinician",
        bookingDate=booking.preferred_date.isoformat(),
        bookingTime=booking.preferred_time,
        patientName=booking.patient_full_name,
        patientPhone=booking.patient_phone,
        patientEmail=booking.patient_email,
        status=booking.status,
    )


# ---------------------------------------------------------
# 13. List Confirmed Bookings Without Confirmation Message
# ---------------------------------------------------------
@router.get(
    "/bookings/unconfirmed-messages",
    response_model=IntegrationUnconfirmedBookingsResponse,
    summary="List Confirmed Bookings Pending Confirmation Message",
)
@limiter.limit("120/minute")
async def list_unconfirmed_bookings(
    request: Request,
    client: IntegrationClient = Depends(require_integration_scope("bookings:read")),
    db: AsyncSession = Depends(get_db_session),
):
    """
    List confirmed bookings for which no confirmation message has been recorded yet.
    Used by automation to ensure every confirmed booking receives a confirmation.
    """
    # Subquery of booking_ids that already have a booking_confirmation message recorded
    confirmed_msgs_subquery = (
        select(MessageORM.booking_id)
        .where(
            MessageORM.booking_id.is_not(None),
            MessageORM.purpose == "booking_confirmation",
        )
    )

    stmt = (
        select(BookingORM)
        .where(
            BookingORM.status == "confirmed",
            BookingORM.id.not_in(confirmed_msgs_subquery),
        )
        .order_by(BookingORM.created_at.desc())
        .limit(100)
    )
    res = await db.execute(stmt)
    bookings = res.scalars().all()

    items = []
    for b in bookings:
        clinic = await db.get(ClinicORM, b.clinic_id) if b.clinic_id else None
        doctor = await db.get(TeamMemberORM, b.team_member_id) if b.team_member_id else None
        svc = None
        if b.service_id:
            try:
                svc = await db.get(ServiceORM, UUID(b.service_id))
            except Exception:
                pass
        items.append(
            IntegrationBookingConfirmationDataResponse(
                bookingId=b.id,
                confirmationId=b.confirmation_id,
                serviceName=svc.title if svc else "Dental Consultation",
                clinicName=clinic.name if clinic else "Marlow Dental Clinic",
                clinicAddress=f"{clinic.address_line1}, {clinic.city}" if clinic else "Lahore",
                clinicPhone=clinic.phone if clinic else "+92 42 3589 1234",
                doctorName=doctor.display_name if doctor else "Doctor",
                bookingDate=b.preferred_date.isoformat(),
                bookingTime=b.preferred_time,
                patientName=b.patient_full_name,
                patientPhone=b.patient_phone,
                patientEmail=b.patient_email,
                status=b.status,
            )
        )

    return IntegrationUnconfirmedBookingsResponse(
        count=len(items),
        bookings=items,
    )
