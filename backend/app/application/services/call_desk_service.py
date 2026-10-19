from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.reception_dto import (
    CallDeskBookingDto,
    CallDeskHoldDto,
    CallDeskLeadDto,
    CallDeskLookupResponse,
    CallDeskMessageDto,
    CallDeskOutcomeRequest,
    CallDeskOutcomeResponse,
    CallDeskPatientDto,
    CallLogResponseDto,
    LeadEventResponseDto,
)
from app.core.database import get_session_factory
from app.domain.models.booking_flow import CallOutcome, MessagePurpose
from app.domain.models.phone_utils import normalize_pakistan_phone
from app.infrastructure.database.orm_models import (
    ActivityLogORM,
    BookingFlowSettingsORM,
    BookingORM,
    CallLogORM,
    ContactHoldORM,
    LeadEventORM,
    LeadORM,
    LocationORM,
    MessageORM,
    PatientMedicalAlertORM,
    PatientORM,
    ServiceORM,
    TeamMemberORM,
)
from app.infrastructure.repositories.postgres_activity_repo import (
    PostgresActivityLogRepository,
    record_activity,
)

VALID_CALL_OUTCOMES = {
    CallOutcome.BOOKED.value,
    CallOutcome.CALLBACK_REQUESTED.value,
    CallOutcome.DROPPED.value,
    CallOutcome.WRONG_NUMBER.value,
    CallOutcome.NOT_INTERESTED.value,
    CallOutcome.INFO_ONLY.value,
}


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def is_held(phone: str, session: Optional[AsyncSession] = None) -> bool:
    """
    Returns True if there is an active (unreleased, not expired) contact hold
    on the normalized phone number. Other code can call this directly.
    """
    if not phone or not phone.strip():
        return False

    norm = normalize_pakistan_phone(phone)
    now = datetime.now(timezone.utc)
    stmt = (
        select(ContactHoldORM.id)
        .where(
            ContactHoldORM.phone_normalized == norm,
            ContactHoldORM.released_at.is_(None),
            ContactHoldORM.held_until > now,
        )
        .limit(1)
    )

    if session is not None:
        res = await session.execute(stmt)
        return res.scalar_one_or_none() is not None

    factory = get_session_factory()
    async with factory() as sess:
        res = await sess.execute(stmt)
        return res.scalar_one_or_none() is not None


async def can_send_message(phone: str, purpose: str, session: Optional[AsyncSession] = None) -> bool:
    """
    A hold blocks ONLY lead-recovery messages (purpose 'lead_recovery').
    Confirmations and reminders are never blocked.
    """
    norm_purpose = (purpose or "").strip().lower()
    if norm_purpose == MessagePurpose.LEAD_RECOVERY.value:
        held = await is_held(phone, session=session)
        return not held
    # Confirmations, reminders, manual messages are never blocked
    return True


class CallDeskService:
    def __init__(self, session: AsyncSession):
        self._session = session
        self._activity_repo = PostgresActivityLogRepository(session)

    async def lookup(self, phone: str, user_id: Optional[UUID] = None) -> CallDeskLookupResponse:
        norm = normalize_pakistan_phone(phone)
        phone_raw = phone.strip()
        now = datetime.now(timezone.utc)
        today = now.date()

        # 1. Patients matching normalized or raw phone
        pat_stmt = (
            select(PatientORM)
            .where(
                or_(
                    PatientORM.phone_normalized == norm,
                    PatientORM.phone == phone_raw,
                    PatientORM.phone == norm,
                )
            )
            .order_by(PatientORM.created_at.asc())
        )
        pat_res = await self._session.execute(pat_stmt)
        patients_orm = pat_res.scalars().all()
        patient_ids = [p.id for p in patients_orm]

        # Count active medical alerts for patients
        alert_counts: Dict[UUID, int] = {}
        if patient_ids:
            alert_stmt = (
                select(PatientMedicalAlertORM.patient_id, func.count(PatientMedicalAlertORM.id))
                .where(
                    PatientMedicalAlertORM.patient_id.in_(patient_ids),
                    PatientMedicalAlertORM.is_active.is_(True),
                )
                .group_by(PatientMedicalAlertORM.patient_id)
            )
            alert_res = await self._session.execute(alert_stmt)
            alert_counts = {row[0]: row[1] for row in alert_res.all()}

        patient_dtos = [
            CallDeskPatientDto(
                id=p.id,
                firstName=p.first_name,
                lastName=p.last_name,
                fullName=f"{p.first_name} {p.last_name}".strip(),
                phone=p.phone or "",
                phoneNormalized=p.phone_normalized or normalize_pakistan_phone(p.phone or ""),
                email=p.email,
                dateOfBirth=p.date_of_birth,
                gender=getattr(p, "gender", None),
                clinicId=p.clinic_id,
                medicalAlertCount=alert_counts.get(p.id, 0),
            )
            for p in patients_orm
        ]

        # 2. Leads matching normalized or raw phone with attempts & history events
        lead_stmt = (
            select(LeadORM)
            .where(
                or_(
                    LeadORM.phone_normalized == norm,
                    LeadORM.phone == phone_raw,
                    LeadORM.phone == norm,
                )
            )
            .order_by(LeadORM.created_at.desc())
        )
        lead_res = await self._session.execute(lead_stmt)
        leads_orm = lead_res.scalars().all()

        lead_dtos: List[CallDeskLeadDto] = []
        for l in leads_orm:
            # Query lead events
            ev_stmt = (
                select(LeadEventORM)
                .where(LeadEventORM.lead_id == l.id)
                .order_by(LeadEventORM.created_at.asc())
            )
            ev_res = await self._session.execute(ev_stmt)
            events = [
                LeadEventResponseDto(
                    id=e.id,
                    leadId=e.lead_id,
                    eventType=e.event_type,
                    actorType=e.actor_type,
                    payload=e.payload or {},
                    actorId=e.actor_id,
                    createdAt=e.created_at,
                )
                for e in ev_res.scalars().all()
            ]

            lead_dtos.append(
                CallDeskLeadDto(
                    id=l.id,
                    fullName=l.full_name,
                    phone=l.phone,
                    phoneNormalized=l.phone_normalized,
                    email=l.email,
                    status=l.status,
                    source=getattr(l, "utm_source", None),
                    attempts=l.attempts or 0,
                    consentNoticeVersion=l.consent_notice_version,
                    events=events,
                    createdAt=l.created_at,
                    updatedAt=l.updated_at,
                )
            )

        # 3. Upcoming Bookings (preferred_date >= today, not cancelled/no_show)
        booking_filter = [
            BookingORM.preferred_date >= today,
            BookingORM.status.not_in(["cancelled", "no_show"]),
        ]
        phone_match_filter = [
            BookingORM.phone_normalized == norm,
            BookingORM.patient_phone == phone_raw,
            BookingORM.patient_phone == norm,
        ]
        if patient_ids:
            phone_match_filter.append(BookingORM.patient_id.in_(patient_ids))

        booking_stmt = (
            select(BookingORM)
            .where(*booking_filter, or_(*phone_match_filter))
            .order_by(BookingORM.preferred_date.asc(), BookingORM.preferred_time.asc())
            .limit(20)
        )
        b_res = await self._session.execute(booking_stmt)
        bookings_orm = b_res.scalars().all()

        # Cache names for clinics, services, team members
        clinic_names: Dict[UUID, str] = {}
        service_names: Dict[str, str] = {}
        doctor_names: Dict[UUID, str] = {}

        booking_dtos: List[CallDeskBookingDto] = []
        for b in bookings_orm:
            c_name = None
            if b.clinic_id:
                if b.clinic_id not in clinic_names:
                    loc = await self._session.get(LocationORM, b.clinic_id)
                    clinic_names[b.clinic_id] = loc.name if loc else "Clinic"
                c_name = clinic_names[b.clinic_id]

            s_name = None
            if b.service_id:
                if b.service_id not in service_names:
                    try:
                        svc_uuid = UUID(b.service_id)
                        svc = await self._session.get(ServiceORM, svc_uuid)
                        service_names[b.service_id] = svc.title if svc else b.service_id
                    except Exception:
                        service_names[b.service_id] = b.service_id
                s_name = service_names.get(b.service_id)

            d_name = None
            if b.team_member_id:
                if b.team_member_id not in doctor_names:
                    doc = await self._session.get(TeamMemberORM, b.team_member_id)
                    doctor_names[b.team_member_id] = doc.name if doc else "Clinician"
                d_name = doctor_names.get(b.team_member_id)

            booking_dtos.append(
                CallDeskBookingDto(
                    id=b.id,
                    confirmationId=b.confirmation_id,
                    preferredDate=b.preferred_date,
                    preferredTime=b.preferred_time,
                    patientFullName=b.patient_full_name,
                    patientPhone=b.patient_phone,
                    patientId=b.patient_id,
                    clinicId=b.clinic_id,
                    clinicName=c_name,
                    serviceId=b.service_id,
                    serviceName=s_name,
                    teamMemberId=b.team_member_id,
                    doctorName=d_name,
                    status=b.status,
                    source=b.source,
                    notes=b.notes,
                    createdAt=b.created_at,
                )
            )

        # 4. Recent Messages
        msg_filters = [
            MessageORM.phone_normalized == norm,
            MessageORM.phone == phone_raw,
            MessageORM.phone == norm,
        ]
        if patient_ids:
            msg_filters.append(MessageORM.patient_id.in_(patient_ids))

        msg_stmt = (
            select(MessageORM)
            .where(or_(*msg_filters))
            .order_by(MessageORM.created_at.desc())
            .limit(50)
        )
        msg_res = await self._session.execute(msg_stmt)
        messages_orm = msg_res.scalars().all()

        message_dtos = [
            CallDeskMessageDto(
                id=m.id,
                channel=m.channel or "sms",
                content=m.content,
                direction=m.direction or "outbound",
                purpose=m.purpose or "manual",
                status=m.status or "logged",
                deliveryStatus=m.delivery_status or "simulated",
                phone=m.phone,
                createdAt=m.created_at,
            )
            for m in messages_orm
        ]

        # 5. Active Hold
        active_hold_stmt = (
            select(ContactHoldORM)
            .where(
                ContactHoldORM.phone_normalized == norm,
                ContactHoldORM.released_at.is_(None),
                ContactHoldORM.held_until > now,
            )
            .order_by(ContactHoldORM.held_until.desc())
            .limit(1)
        )
        hold_res = await self._session.execute(active_hold_stmt)
        hold_orm = hold_res.scalar_one_or_none()

        active_hold_dto = None
        if hold_orm:
            held_until_utc = ensure_utc(hold_orm.held_until)
            remaining = max(0, int((held_until_utc - now).total_seconds())) if held_until_utc else 0
            active_hold_dto = CallDeskHoldDto(
                id=hold_orm.id,
                phoneNormalized=hold_orm.phone_normalized,
                heldUntil=held_until_utc,
                remainingSeconds=remaining,
                isActive=True,
                createdAt=ensure_utc(hold_orm.created_at),
            )

        # Audit lookup
        await record_activity(
            self._activity_repo,
            action="call_desk_lookup",
            entity_type="call_desk",
            user_id=user_id,
            details={
                "phone_normalized": norm,
                "phone_raw": phone_raw,
                "patient_count": len(patient_dtos),
                "lead_count": len(lead_dtos),
                "upcoming_booking_count": len(booking_dtos),
                "recent_message_count": len(message_dtos),
            },
        )

        return CallDeskLookupResponse(
            phoneNormalized=norm,
            phoneRaw=phone_raw,
            patients=patient_dtos,
            leads=lead_dtos,
            upcomingBookings=booking_dtos,
            recentMessages=message_dtos,
            activeHold=active_hold_dto,
        )

    async def start_or_extend_hold(
        self,
        phone: str,
        hold_minutes: Optional[int] = None,
        user_id: Optional[UUID] = None,
        reason: Optional[str] = "call_desk",
    ) -> CallDeskHoldDto:
        norm = normalize_pakistan_phone(phone)
        now = datetime.now(timezone.utc)

        # Retrieve default hold minutes if not specified
        if hold_minutes is None or hold_minutes <= 0:
            bfs_res = await self._session.execute(
                select(BookingFlowSettingsORM.hold_minutes)
                .order_by(BookingFlowSettingsORM.created_at.asc())
                .limit(1)
            )
            default_mins = bfs_res.scalar_one_or_none()
            hold_minutes = default_mins if default_mins else 30

        new_expiry = now + timedelta(minutes=hold_minutes)

        # Check for existing active hold
        hold_stmt = (
            select(ContactHoldORM)
            .where(
                ContactHoldORM.phone_normalized == norm,
                ContactHoldORM.released_at.is_(None),
                ContactHoldORM.held_until > now,
            )
            .order_by(ContactHoldORM.held_until.desc())
            .limit(1)
        )
        hold_res = await self._session.execute(hold_stmt)
        hold_orm = hold_res.scalar_one_or_none()

        action = "call_desk_hold_start"
        if hold_orm:
            # Extend existing active hold
            action = "call_desk_hold_extend"
            existing_until = ensure_utc(hold_orm.held_until)
            hold_orm.held_until = max(existing_until, new_expiry) if existing_until else new_expiry
            if reason:
                hold_orm.reason = reason
        else:
            # Create new hold
            hold_orm = ContactHoldORM(
                phone_normalized=norm,
                held_until=new_expiry,
                reason=reason or "call_desk",
                created_by_user_id=user_id,
                released_at=None,
                created_at=now,
            )
            self._session.add(hold_orm)

        await self._session.flush()
        await self._session.refresh(hold_orm)

        # Audit hold operation
        await record_activity(
            self._activity_repo,
            action=action,
            entity_type="contact_hold",
            entity_id=hold_orm.id,
            user_id=user_id,
            details={
                "phone_normalized": norm,
                "held_until": hold_orm.held_until.isoformat(),
                "hold_minutes": hold_minutes,
                "reason": reason,
            },
        )

        held_until_utc = ensure_utc(hold_orm.held_until)
        remaining = max(0, int((held_until_utc - now).total_seconds())) if held_until_utc else 0
        return CallDeskHoldDto(
            id=hold_orm.id,
            phoneNormalized=hold_orm.phone_normalized,
            heldUntil=held_until_utc,
            remainingSeconds=remaining,
            isActive=True,
            createdAt=ensure_utc(hold_orm.created_at),
        )

    async def release_hold(self, phone: str, user_id: Optional[UUID] = None) -> Dict[str, Any]:
        norm = normalize_pakistan_phone(phone)
        now = datetime.now(timezone.utc)

        stmt = (
            update(ContactHoldORM)
            .where(
                ContactHoldORM.phone_normalized == norm,
                ContactHoldORM.released_at.is_(None),
                ContactHoldORM.held_until > now,
            )
            .values(released_at=now)
        )
        res = await self._session.execute(stmt)
        count = res.rowcount or 0
        await self._session.flush()

        await record_activity(
            self._activity_repo,
            action="call_desk_hold_release",
            entity_type="contact_hold",
            user_id=user_id,
            details={
                "phone_normalized": norm,
                "released_count": count,
            },
        )

        return {"released": True, "count": count}

    async def record_outcome(
        self,
        req: CallDeskOutcomeRequest,
        user_id: Optional[UUID] = None,
    ) -> CallDeskOutcomeResponse:
        outcome_clean = req.outcome.strip().lower()
        if outcome_clean not in VALID_CALL_OUTCOMES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid call outcome '{req.outcome}'. Must be one of: {', '.join(sorted(VALID_CALL_OUTCOMES))}",
            )

        norm = normalize_pakistan_phone(req.phone)
        now = datetime.now(timezone.utc)

        # 1. Release active hold on caller's phone
        await self.release_hold(phone=norm, user_id=user_id)

        # 2. Insert CallLogORM
        call_log = CallLogORM(
            phone_normalized=norm,
            outcome=outcome_clean,
            notes=req.notes,
            lead_id=req.leadId,
            patient_id=req.patientId,
            booking_id=req.bookingId,
            started_at=req.startedAt or now,
            ended_at=req.endedAt or now,
            recorded_by_user_id=user_id,
            created_at=now,
        )
        self._session.add(call_log)
        await self._session.flush()
        await self._session.refresh(call_log)

        # 3. Handle optional lead capture when the call dropped
        lead_captured = False
        captured_lead_id: Optional[UUID] = None

        if outcome_clean == CallOutcome.DROPPED.value:
            captured_name = (
                req.leadCapture.name.strip()
                if (req.leadCapture and req.leadCapture.name and req.leadCapture.name.strip())
                else None
            )
            captured_email = (
                req.leadCapture.email.strip()
                if (req.leadCapture and req.leadCapture.email and req.leadCapture.email.strip())
                else None
            )

            if captured_name or captured_email:
                # Contact details collected: save unconverted lead so recovery resumes
                existing_lead = None
                if req.leadId:
                    existing_lead = await self._session.get(LeadORM, req.leadId)
                if not existing_lead:
                    find_lead_stmt = (
                        select(LeadORM)
                        .where(
                            LeadORM.phone_normalized == norm,
                            LeadORM.status == "unconverted",
                        )
                        .order_by(LeadORM.created_at.desc())
                        .limit(1)
                    )
                    f_res = await self._session.execute(find_lead_stmt)
                    existing_lead = f_res.scalar_one_or_none()

                if existing_lead:
                    if captured_name and not existing_lead.full_name:
                        existing_lead.full_name = captured_name
                    if captured_email and not existing_lead.email:
                        existing_lead.email = captured_email
                    existing_lead.updated_at = now
                    captured_lead_id = existing_lead.id
                else:
                    new_lead = LeadORM(
                        full_name=captured_name or "Caller",
                        phone=req.phone,
                        phone_normalized=norm,
                        email=captured_email,
                        status="unconverted",
                        utm_source="call_desk",
                        notes=req.notes,
                        created_at=now,
                        updated_at=now,
                    )
                    self._session.add(new_lead)
                    await self._session.flush()
                    captured_lead_id = new_lead.id

                lead_captured = True
                call_log.lead_id = captured_lead_id

                # Write lead_events record
                ev = LeadEventORM(
                    lead_id=captured_lead_id,
                    event_type="call_dropped_captured",
                    actor_type="user",
                    actor_id=str(user_id) if user_id else "system",
                    payload={
                        "outcome": "dropped",
                        "notes": req.notes,
                        "captured_name": captured_name,
                        "captured_email": captured_email,
                        "call_log_id": str(call_log.id),
                    },
                    created_at=now,
                )
                self._session.add(ev)
            else:
                # Nothing collected -> create NO lead
                lead_captured = False
                captured_lead_id = None
        else:
            # For other outcomes, if a lead exists, write outcome to lead_events
            target_lead_id = req.leadId
            if not target_lead_id:
                lead_stmt = (
                    select(LeadORM.id)
                    .where(
                        LeadORM.phone_normalized == norm,
                        LeadORM.status == "unconverted",
                    )
                    .order_by(LeadORM.created_at.desc())
                    .limit(1)
                )
                l_res = await self._session.execute(lead_stmt)
                target_lead_id = l_res.scalar_one_or_none()

            if target_lead_id:
                ev = LeadEventORM(
                    lead_id=target_lead_id,
                    event_type=f"call_{outcome_clean}",
                    actor_type="user",
                    actor_id=str(user_id) if user_id else "system",
                    payload={
                        "outcome": outcome_clean,
                        "notes": req.notes,
                        "call_log_id": str(call_log.id),
                    },
                    created_at=now,
                )
                self._session.add(ev)
                call_log.lead_id = target_lead_id

        await self._session.flush()

        # Audit outcome
        await record_activity(
            self._activity_repo,
            action="call_desk_outcome",
            entity_type="call_log",
            entity_id=call_log.id,
            user_id=user_id,
            details={
                "phone_normalized": norm,
                "outcome": outcome_clean,
                "lead_captured": lead_captured,
                "captured_lead_id": str(captured_lead_id) if captured_lead_id else None,
                "notes": req.notes,
            },
        )

        return CallDeskOutcomeResponse(
            callLog=CallLogResponseDto(
                id=call_log.id,
                phoneNormalized=call_log.phone_normalized,
                leadId=call_log.lead_id,
                patientId=call_log.patient_id,
                bookingId=call_log.booking_id,
                outcome=call_log.outcome,
                notes=call_log.notes,
                startedAt=call_log.started_at,
                endedAt=call_log.ended_at,
                recordedByUserId=call_log.recorded_by_user_id,
                createdAt=call_log.created_at,
            ),
            leadCaptured=lead_captured,
            capturedLeadId=captured_lead_id,
            holdReleased=True,
        )
