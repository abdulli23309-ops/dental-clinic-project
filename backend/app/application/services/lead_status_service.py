from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status as http_status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_flow import LeadStatus, is_valid_lead_transition
from app.domain.models.phone_utils import normalize_pakistan_phone
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
from app.infrastructure.repositories.postgres_activity_repo import record_activity


def ensure_utc(dt: Any) -> datetime:
    """Ensure datetime is offset-aware in UTC (compatible with SQLite strings)."""
    if dt is None:
        return datetime.now(timezone.utc)
    if isinstance(dt, str):
        try:
            parsed = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)
    if hasattr(dt, "tzinfo") and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class LeadStatusService:
    """
    Lead Status Engine per BOOKING_FLOW_SPEC.md:
    - Enforces state transition rules across the lead lifecycle
    - Handles automatic transitions:
        * capture = unconverted
        * booking created = converted
        * first booking completed = patient (also covers leads linked by patient or phone)
        * no automatic reverts
    - Cold rule job: marks leads cold when attempts >= max_attempts and cold_wait_hours passed
      with no reply or booking; creates exactly one task for fallback_owner_user_id (idempotent)
    - failed_conversion rule: transitions lead and creates follow-up task
    - Manual status changes: strictly audited with required reason
    - Unified lead timeline retrieval (events, messages, call logs, bookings)
    """

    def __init__(self, session: AsyncSession, activity_repo: Optional[Any] = None):
        self.session = session
        self.activity_repo = activity_repo

    async def _get_settings(self, organization_id: Optional[UUID] = None) -> BookingFlowSettingsORM:
        stmt = select(BookingFlowSettingsORM)
        if organization_id:
            stmt = stmt.where(BookingFlowSettingsORM.organization_id == organization_id)
        result = await self.session.execute(stmt)
        settings = result.scalars().first()
        if not settings:
            # Fallback default
            settings = BookingFlowSettingsORM(
                max_attempts=3,
                cold_wait_hours=24,
                hold_minutes=30,
                fallback_owner_user_id=None,
            )
        return settings

    async def on_booking_created(
        self,
        booking: Any,
        user_id: Optional[UUID] = None,
    ) -> List[UUID]:
        """
        Triggered when a booking is created (online or through call desk / reception).
        Transitions matching unconverted/cold/failed leads to 'converted'.
        """
        now_utc = datetime.now(timezone.utc)
        target_leads: List[LeadORM] = []

        booking_id = getattr(booking, "id", None)
        lead_id = getattr(booking, "lead_id", None)
        patient_id = getattr(booking, "patient_id", None)
        patient_phone = getattr(booking, "patient_phone", None) or getattr(booking, "phone", None)
        norm_phone = normalize_pakistan_phone(patient_phone) if patient_phone else ""

        if lead_id:
            lead = await self.session.get(LeadORM, lead_id)
            if lead and lead not in target_leads:
                target_leads.append(lead)

        if norm_phone:
            stmt = select(LeadORM).where(
                or_(
                    LeadORM.phone_normalized == norm_phone,
                    LeadORM.phone == patient_phone,
                )
            )
            res = await self.session.execute(stmt)
            for l in res.scalars().all():
                if l not in target_leads:
                    target_leads.append(l)

        if patient_id:
            stmt = select(LeadORM).where(LeadORM.patient_id == patient_id)
            res = await self.session.execute(stmt)
            for l in res.scalars().all():
                if l not in target_leads:
                    target_leads.append(l)

        converted_ids: List[UUID] = []
        for lead in target_leads:
            # Rules: no automatic reverts; can transition from unconverted, cold, or failed_conversion
            if lead.status in (
                LeadStatus.UNCONVERTED.value,
                LeadStatus.COLD.value,
                LeadStatus.FAILED_CONVERSION.value,
            ):
                old_status = lead.status
                lead.status = LeadStatus.CONVERTED.value
                lead.last_activity_at = now_utc
                if patient_id and not lead.patient_id:
                    lead.patient_id = patient_id

                ev = LeadEventORM(
                    lead_id=lead.id,
                    event_type="lead_converted",
                    actor_type="user" if user_id else "system",
                    actor_id=str(user_id) if user_id else "booking_engine",
                    payload={
                        "previous_status": old_status,
                        "booking_id": str(booking_id) if booking_id else None,
                        "confirmation_id": getattr(booking, "confirmation_id", None),
                        "source": getattr(booking, "source", None),
                    },
                )
                self.session.add(ev)
                converted_ids.append(lead.id)

        await self.session.flush()
        return converted_ids

    async def on_booking_completed(
        self,
        booking: Any,
        user_id: Optional[UUID] = None,
    ) -> List[UUID]:
        """
        Triggered when a booking is marked completed.
        Rule: 'First booking marked completed = patient. (also covers leads linked by patient or phone)'
        Checks if this is the first completed visit, and transitions linked leads to 'patient'.
        """
        now_utc = datetime.now(timezone.utc)
        patient_id = getattr(booking, "patient_id", None)
        patient_phone = getattr(booking, "patient_phone", None) or getattr(booking, "phone", None)
        norm_phone = normalize_pakistan_phone(patient_phone) if patient_phone else ""
        lead_id = getattr(booking, "lead_id", None)

        target_leads: List[LeadORM] = []
        if lead_id:
            lead = await self.session.get(LeadORM, lead_id)
            if lead and lead not in target_leads:
                target_leads.append(lead)

        if patient_id:
            stmt = select(LeadORM).where(LeadORM.patient_id == patient_id)
            res = await self.session.execute(stmt)
            for l in res.scalars().all():
                if l not in target_leads:
                    target_leads.append(l)

        if norm_phone:
            stmt = select(LeadORM).where(
                or_(
                    LeadORM.phone_normalized == norm_phone,
                    LeadORM.phone == patient_phone,
                )
            )
            res = await self.session.execute(stmt)
            for l in res.scalars().all():
                if l not in target_leads:
                    target_leads.append(l)

        updated_ids: List[UUID] = []
        for lead in target_leads:
            # No automatic reverts: if already patient or archived, do not change
            if lead.status not in (LeadStatus.PATIENT.value, LeadStatus.ARCHIVED.value):
                old_status = lead.status
                lead.status = LeadStatus.PATIENT.value
                lead.last_activity_at = now_utc
                if patient_id and not lead.patient_id:
                    lead.patient_id = patient_id

                ev = LeadEventORM(
                    lead_id=lead.id,
                    event_type="became_patient",
                    actor_type="user" if user_id else "system",
                    actor_id=str(user_id) if user_id else "visit_completion",
                    payload={
                        "previous_status": old_status,
                        "new_status": LeadStatus.PATIENT.value,
                        "booking_id": str(getattr(booking, "id", "")),
                        "reason": "first_booking_completed",
                    },
                )
                self.session.add(ev)
                updated_ids.append(lead.id)

        await self.session.flush()
        return updated_ids

    async def mark_cold_leads(
        self,
        organization_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Cold rule per spec:
        'marks leads cold when attempts >= max_attempts and cold_wait_hours have passed with no reply or booking;
         creates exactly one call task for fallback_owner_user_id (or unassigned) titled "Call to follow up: <name>";
         idempotent; writes events.'
        """
        now_utc = datetime.now(timezone.utc)
        flow_settings = await self._get_settings(organization_id)
        max_attempts = flow_settings.max_attempts or 3
        cold_wait_hours = flow_settings.cold_wait_hours or 24
        fallback_owner_id = flow_settings.fallback_owner_user_id
        cutoff = now_utc - timedelta(hours=cold_wait_hours)

        stmt = select(LeadORM).where(
            LeadORM.status == LeadStatus.UNCONVERTED.value,
            LeadORM.attempts >= max_attempts,
        )
        if organization_id:
            stmt = stmt.where(LeadORM.organization_id == organization_id)

        res = await self.session.execute(stmt)
        candidates = res.scalars().all()

        marked_leads: List[LeadORM] = []

        for lead in candidates:
            # 1. Check cold_wait_hours passed since last attempt / contact
            ref_time = ensure_utc(lead.last_contacted_at or lead.last_activity_at or lead.created_at)
            if ref_time > cutoff:
                continue

            # 2. Check no reply (no inbound message since lead creation)
            msg_stmt = select(func.count(MessageORM.id)).where(
                MessageORM.direction == "inbound",
                or_(
                    MessageORM.lead_id == lead.id,
                    MessageORM.phone_normalized == lead.phone_normalized,
                    MessageORM.phone == lead.phone,
                ),
                MessageORM.created_at >= lead.created_at,
            )
            inbound_count = (await self.session.execute(msg_stmt)).scalar() or 0
            if inbound_count > 0:
                continue

            # 3. Check no booking created since lead creation
            b_stmt = select(func.count(BookingORM.id)).where(
                or_(
                    BookingORM.lead_id == lead.id,
                    BookingORM.phone_normalized == lead.phone_normalized,
                    BookingORM.patient_phone == lead.phone,
                ),
                BookingORM.created_at >= lead.created_at,
            )
            booking_count = (await self.session.execute(b_stmt)).scalar() or 0
            if booking_count > 0:
                continue

            # Mark cold
            old_status = lead.status
            lead.status = LeadStatus.COLD.value
            lead.cold_at = now_utc
            lead.last_activity_at = now_utc
            lead.updated_at = now_utc

            # Exactly one task created (idempotent check)
            task_title = f"Call to follow up: {lead.full_name}"
            existing_task_stmt = select(TaskORM).where(
                TaskORM.title == task_title,
                or_(
                    TaskORM.patient_id == lead.patient_id,
                    TaskORM.description.contains(str(lead.id)),
                ),
            )
            existing_task = (await self.session.execute(existing_task_stmt)).scalars().first()

            created_task_id: Optional[UUID] = None
            if not existing_task:
                followup_task = TaskORM(
                    clinic_id=lead.clinic_id,
                    patient_id=lead.patient_id,
                    assigned_to_user_id=fallback_owner_id,
                    title=task_title,
                    description=f"Cold follow up for lead {lead.full_name} ({lead.phone}). "
                                f"{lead.attempts} attempts reached with no reply or booking after {cold_wait_hours}h.",
                    due_date=now_utc,
                    status="pending",
                    priority="medium",
                )
                self.session.add(followup_task)
                await self.session.flush()
                created_task_id = followup_task.id
            else:
                created_task_id = existing_task.id

            # Write event
            ev = LeadEventORM(
                lead_id=lead.id,
                event_type="marked_cold",
                actor_type="system",
                actor_id="cold_rule_job",
                payload={
                    "previous_status": old_status,
                    "attempts": lead.attempts,
                    "cold_wait_hours": cold_wait_hours,
                    "task_id": str(created_task_id) if created_task_id else None,
                    "fallback_owner_id": str(fallback_owner_id) if fallback_owner_id else None,
                },
            )
            self.session.add(ev)
            marked_leads.append(lead)

        await self.session.flush()
        return {
            "marked_cold_count": len(marked_leads),
            "lead_ids": [str(l.id) for l in marked_leads],
        }

    async def mark_failed_conversion(
        self,
        lead_id: UUID,
        reason: Optional[str] = None,
        actor_type: str = "system",
        actor_id: Optional[str] = None,
    ) -> LeadORM:
        """
        failed_conversion rule per spec:
        'automation reports all channels failed; creates ONE task.'
        """
        now_utc = datetime.now(timezone.utc)
        lead = await self.session.get(LeadORM, lead_id)
        if not lead:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Lead not found.",
            )

        old_status = lead.status
        lead.status = LeadStatus.FAILED_CONVERSION.value
        lead.last_activity_at = now_utc
        lead.updated_at = now_utc

        flow_settings = await self._get_settings(lead.organization_id)
        fallback_owner_id = flow_settings.fallback_owner_user_id

        task_title = f"Call to follow up: {lead.full_name}"
        existing_task_stmt = select(TaskORM).where(
            TaskORM.title == task_title,
            or_(
                TaskORM.patient_id == lead.patient_id,
                TaskORM.description.contains(str(lead.id)),
            ),
        )
        existing_task = (await self.session.execute(existing_task_stmt)).scalars().first()

        created_task_id: Optional[UUID] = None
        if not existing_task:
            task = TaskORM(
                clinic_id=lead.clinic_id,
                patient_id=lead.patient_id,
                assigned_to_user_id=fallback_owner_id,
                title=task_title,
                description=f"Conversion failed for {lead.full_name} ({lead.phone}). "
                            f"Reason: {reason or 'All automated communication channels failed.'} (Lead: {lead.id})",
                due_date=now_utc,
                status="pending",
                priority="high",
            )
            self.session.add(task)
            await self.session.flush()
            created_task_id = task.id
        else:
            created_task_id = existing_task.id

        ev = LeadEventORM(
            lead_id=lead.id,
            event_type="failed_conversion",
            actor_type=actor_type,
            actor_id=actor_id or "automation",
            payload={
                "previous_status": old_status,
                "reason": reason or "All channels failed",
                "task_id": str(created_task_id) if created_task_id else None,
            },
        )
        self.session.add(ev)
        await self.session.flush()
        return lead

    async def change_status_manual(
        self,
        lead_id: UUID,
        new_status: str,
        reason: str,
        user_id: UUID,
    ) -> LeadORM:
        """
        Manual status change by reception or admin.
        Rule: 'No automatic reverts; reception may set status by hand (audited with reason).'
        """
        now_utc = datetime.now(timezone.utc)
        if not reason or not reason.strip():
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A valid reason is strictly required when manually updating lead status.",
            )

        try:
            target_status_enum = LeadStatus(new_status.strip().lower())
        except ValueError:
            valid_statuses = [s.value for s in LeadStatus]
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid lead status '{new_status}'. Allowed statuses: {valid_statuses}",
            )

        lead = await self.session.get(LeadORM, lead_id)
        if not lead:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Lead not found.",
            )

        old_status = lead.status
        lead.status = target_status_enum.value
        lead.last_activity_at = now_utc
        lead.updated_at = now_utc

        ev = LeadEventORM(
            lead_id=lead.id,
            event_type="status_change",
            actor_type="user",
            actor_id=str(user_id),
            payload={
                "previous_status": old_status,
                "new_status": target_status_enum.value,
                "reason": reason.strip(),
            },
        )
        self.session.add(ev)

        if self.activity_repo:
            await record_activity(
                self.activity_repo,
                action="lead_status_change",
                entity_type="lead",
                entity_id=lead.id,
                user_id=user_id,
                details={
                    "previous_status": old_status,
                    "new_status": target_status_enum.value,
                    "reason": reason.strip(),
                },
            )

        await self.session.flush()
        return lead

    async def get_lead_timeline(self, lead_id: UUID) -> List[Dict[str, Any]]:
        """
        Retrieves a complete chronological timeline for a lead:
        - lead_events (captures, transitions, audits)
        - messages (inbound & outbound)
        - calls (call_logs)
        - bookings (appointments)
        """
        lead = await self.session.get(LeadORM, lead_id)
        if not lead:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Lead not found.",
            )

        timeline: List[Dict[str, Any]] = []

        # 1. Lead Events
        ev_stmt = select(LeadEventORM).where(LeadEventORM.lead_id == lead_id).order_by(LeadEventORM.created_at.desc())
        ev_res = await self.session.execute(ev_stmt)
        for ev in ev_res.scalars().all():
            timeline.append({
                "id": str(ev.id),
                "type": "event",
                "eventType": ev.event_type,
                "actorType": ev.actor_type,
                "actorId": ev.actor_id,
                "payload": ev.payload,
                "timestamp": ev.created_at.isoformat() if ev.created_at else None,
            })

        # 2. Messages
        msg_stmt = select(MessageORM).where(
            or_(
                MessageORM.lead_id == lead_id,
                MessageORM.phone_normalized == lead.phone_normalized,
                MessageORM.phone == lead.phone,
            )
        ).order_by(MessageORM.created_at.desc())
        msg_res = await self.session.execute(msg_stmt)
        for m in msg_res.scalars().all():
            timeline.append({
                "id": str(m.id),
                "type": "message",
                "channel": m.channel,
                "direction": m.direction,
                "purpose": m.purpose,
                "content": m.content,
                "deliveryStatus": m.delivery_status,
                "timestamp": m.created_at.isoformat() if m.created_at else None,
            })

        # 3. Call Logs
        call_stmt = select(CallLogORM).where(
            or_(
                CallLogORM.lead_id == lead_id,
                CallLogORM.phone_normalized == lead.phone_normalized,
            )
        ).order_by(CallLogORM.created_at.desc())
        call_res = await self.session.execute(call_stmt)
        for c in call_res.scalars().all():
            timeline.append({
                "id": str(c.id),
                "type": "call",
                "outcome": c.outcome,
                "notes": c.notes,
                "startedAt": c.started_at.isoformat() if c.started_at else None,
                "endedAt": c.ended_at.isoformat() if c.ended_at else None,
                "timestamp": c.created_at.isoformat() if c.created_at else None,
            })

        # 4. Bookings
        b_stmt = select(BookingORM).where(
            or_(
                BookingORM.lead_id == lead_id,
                BookingORM.phone_normalized == lead.phone_normalized,
                BookingORM.patient_phone == lead.phone,
                (BookingORM.patient_id == lead.patient_id) if lead.patient_id else False,
            )
        ).order_by(BookingORM.created_at.desc())
        b_res = await self.session.execute(b_stmt)
        for b in b_res.scalars().all():
            timeline.append({
                "id": str(b.id),
                "type": "booking",
                "confirmationId": b.confirmation_id,
                "preferredDate": str(b.preferred_date),
                "preferredTime": b.preferred_time,
                "status": b.status,
                "source": b.source,
                "timestamp": b.created_at.isoformat() if b.created_at else None,
            })

        # Sort combined timeline newest first
        def parse_ts(item):
            ts = item.get("timestamp")
            if not ts:
                return datetime.min.replace(tzinfo=timezone.utc)
            return ensure_utc(ts)

        timeline.sort(key=parse_ts, reverse=True)
        return timeline

    async def enrich_bookings_with_lead_and_first_visit(
        self,
        bookings: List[Any],
    ) -> tuple[Dict[UUID, bool], Dict[UUID, Optional[str]]]:
        """
        Calculates first visit flags and associated lead statuses for a collection of bookings.
        - First visit: True if the patient has no other completed visits (or this is their first completed visit).
        - Lead status: Resolves current lifecycle status from linked lead (by lead_id, patient_id, or phone).
        """
        if not bookings:
            return {}, {}

        first_visit_map: Dict[UUID, bool] = {}
        lead_status_map: Dict[UUID, Optional[str]] = {}

        lead_ids = [getattr(b, "lead_id", None) for b in bookings if getattr(b, "lead_id", None)]
        phones = [getattr(b, "phone_normalized", None) for b in bookings if getattr(b, "phone_normalized", None)]
        patient_ids = [getattr(b, "patient_id", None) for b in bookings if getattr(b, "patient_id", None)]

        lead_by_id: Dict[UUID, str] = {}
        lead_by_phone: Dict[str, str] = {}
        lead_by_patient: Dict[UUID, str] = {}

        conditions = []
        if lead_ids:
            conditions.append(LeadORM.id.in_(lead_ids))
        if phones:
            conditions.append(LeadORM.phone_normalized.in_(phones))
        if patient_ids:
            conditions.append(LeadORM.patient_id.in_(patient_ids))

        if conditions:
            stmt = select(LeadORM).where(or_(*conditions))
            leads_res = await self.session.execute(stmt)
            for l in leads_res.scalars().all():
                if l.id:
                    lead_by_id[l.id] = l.status
                if l.phone_normalized and l.phone_normalized not in lead_by_phone:
                    lead_by_phone[l.phone_normalized] = l.status
                if l.patient_id and l.patient_id not in lead_by_patient:
                    lead_by_patient[l.patient_id] = l.status

        completed_counts: Dict[UUID, int] = {}
        if patient_ids:
            stmt = (
                select(BookingORM.patient_id, func.count(BookingORM.id))
                .where(
                    BookingORM.patient_id.in_(patient_ids),
                    BookingORM.status == "completed",
                )
                .group_by(BookingORM.patient_id)
            )
            counts_res = await self.session.execute(stmt)
            for pid, cnt in counts_res.all():
                completed_counts[pid] = cnt

        for b in bookings:
            b_id = getattr(b, "id", None)
            if not b_id:
                continue

            l_id = getattr(b, "lead_id", None)
            p_norm = getattr(b, "phone_normalized", None)
            p_id = getattr(b, "patient_id", None)
            st = lead_by_id.get(l_id) or lead_by_patient.get(p_id) or lead_by_phone.get(p_norm)
            lead_status_map[b_id] = st

            b_status = getattr(b, "status", None)
            cnt = completed_counts.get(p_id, 0) if p_id else 0
            if b_status == "completed":
                first_visit_map[b_id] = (cnt <= 1)
            else:
                first_visit_map[b_id] = (cnt == 0)

        return first_visit_map, lead_status_map

    async def log_contact_attempt(
        self,
        lead_id: UUID,
        channel: str,
        result: str,
        note: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> LeadORM:
        lead = await self.session.get(LeadORM, lead_id)
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lead with id {lead_id} not found",
            )
        now_utc = datetime.now(timezone.utc)
        flow_settings = await self._get_settings(lead.organization_id)
        gaps = flow_settings.followup_gaps_minutes or [10, 1440, 2880]
        max_attempts = flow_settings.max_attempts or 3

        lead.attempts = (lead.attempts or 0) + 1
        lead.last_contacted_at = now_utc
        lead.last_activity_at = now_utc
        lead.updated_at = now_utc

        # Next attempt calculation from gaps
        if lead.attempts < len(gaps):
            lead.next_attempt_at = now_utc + timedelta(minutes=gaps[lead.attempts])
        elif lead.attempts < max_attempts and gaps:
            lead.next_attempt_at = now_utc + timedelta(minutes=gaps[-1])
        else:
            lead.next_attempt_at = None

        # Write lead_events record
        ev = LeadEventORM(
            lead_id=lead.id,
            event_type="contact_attempt",
            actor_type="user" if user_id else "system",
            actor_id=str(user_id) if user_id else "system",
            payload={
                "channel": channel,
                "result": result,
                "note": note,
                "attempt_number": lead.attempts,
                "next_attempt_at": str(lead.next_attempt_at) if lead.next_attempt_at else None,
            },
            created_at=now_utc,
        )
        self.session.add(ev)
        await self.session.flush()

        # Audit
        if self.activity_repo:
            await record_activity(
                self.activity_repo,
                action="lead_attempt_logged",
                entity_type="lead",
                entity_id=lead.id,
                user_id=user_id,
                details={
                    "channel": channel,
                    "result": result,
                    "note": note,
                    "attempts": lead.attempts,
                    "next_attempt_at": str(lead.next_attempt_at) if lead.next_attempt_at else None,
                },
            )

        return lead


