import asyncio
from contextlib import asynccontextmanager
import hashlib
import random
import re
import string
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status as http_status
from sqlalchemy import text

from app.domain.models.booking_crm import Booking, Lead, Message, Patient, Task
from app.domain.models.appointment import Appointment, AppointmentStatus
from app.domain.repositories.appointment_repo import AppointmentRepository
from app.domain.repositories.booking_repo import BookingRepository
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.domain.repositories.lead_repo import LeadRepository
from app.domain.repositories.message_repo import MessageRepository
from app.domain.repositories.patient_repo import PatientRepository
from app.domain.repositories.service_repo import ServiceRepository
from app.domain.repositories.task_repo import TaskRepository
from app.infrastructure.repositories.postgres_activity_repo import (
    PostgresActivityLogRepository,
    record_activity,
)

_SCHEDULE_MUTEXES: Dict[str, asyncio.Lock] = {}
_MUTEX_REGISTRY_LOCK = asyncio.Lock()


async def _get_schedule_mutex(team_member_id: Optional[UUID], preferred_date: date) -> asyncio.Lock:
    key = f"{team_member_id or 'all'}:{preferred_date.isoformat()}"
    async with _MUTEX_REGISTRY_LOCK:
        if key not in _SCHEDULE_MUTEXES:
            _SCHEDULE_MUTEXES[key] = asyncio.Lock()
        return _SCHEDULE_MUTEXES[key]


@asynccontextmanager
async def _acquire_schedule_lock(booking_repo: Any, team_member_id: Optional[UUID], preferred_date: Optional[date]):
    if not preferred_date:
        yield
        return
    mutex = await _get_schedule_mutex(team_member_id, preferred_date)
    async with mutex:
        session = getattr(booking_repo, "_session", None)
        if session is not None and getattr(session, "bind", None) is not None:
            dialect = getattr(session.bind, "dialect", None)
            if dialect is not None and dialect.name == "postgresql":
                provider_part = str(team_member_id) if team_member_id else "all"
                raw_key = f"marlow_schedule:{provider_part}:{preferred_date.isoformat()}".encode("utf-8")
                lock_id = int.from_bytes(hashlib.sha256(raw_key).digest()[:8], byteorder="big", signed=True)
                await session.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": lock_id})
        yield


def generate_booking_confirmation_id() -> str:
    year = datetime.now(timezone.utc).year
    suffix = "".join(random.choices(string.digits, k=4))
    return f"BK-{year}-{suffix}"


def parse_time_to_minutes(time_str: Optional[str]) -> Optional[int]:
    if not time_str or not time_str.strip():
        return None
    s = time_str.strip().upper()
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$", s)
    if not m:
        return None
    hours = int(m.group(1))
    minutes = int(m.group(2)) if m.group(2) else 0
    ampm = m.group(3)

    if ampm == "AM":
        if hours == 12:
            hours = 0
        elif hours > 12:
            return None
    elif ampm == "PM":
        if hours < 12:
            hours += 12
        elif hours > 12:
            return None
    else:
        if hours > 23 or minutes > 59:
            return None

    if minutes > 59:
        return None
    return hours * 60 + minutes


def parse_duration_to_minutes(duration_str: Optional[str]) -> int:
    if not duration_str:
        return 30
    m = re.search(r"(\d+(?:\.\d+)?)\s*(h|hr|hour|min|m)?", duration_str.lower())
    if not m:
        return 30
    val = float(m.group(1))
    unit = m.group(2) or "min"
    if "h" in unit:
        return int(val * 60)
    return int(val)


class ReceptionService:
    def __init__(
        self,
        booking_repo: BookingRepository,
        patient_repo: PatientRepository,
        task_repo: TaskRepository,
        lead_repo: LeadRepository,
        message_repo: MessageRepository,
        appointment_repo: AppointmentRepository,
        service_repo: Optional[ServiceRepository] = None,
        activity_repo: Optional[PostgresActivityLogRepository] = None,
        booking_settings_repo: Optional[BookingSettingsRepository] = None,
    ):
        self.booking_repo = booking_repo
        self.patient_repo = patient_repo
        self.task_repo = task_repo
        self.lead_repo = lead_repo
        self.message_repo = message_repo
        self.appointment_repo = appointment_repo
        self.service_repo = service_repo
        self.activity_repo = activity_repo
        self.booking_settings_repo = booking_settings_repo

    async def get_dashboard_summary(
        self, clinic_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        today = datetime.now(timezone.utc).date()

        # 1. Today's bookings
        today_bookings, total_today = await self.booking_repo.list_bookings(
            clinic_id=clinic_id,
            date_from=today,
            date_to=today,
            limit=200,
        )

        counts = await self.booking_repo.get_counts_for_date(today, clinic_id=clinic_id)
        confirmed_count = counts.get("confirmed", 0)
        unconfirmed_count = counts.get("requested", 0)
        checked_in_count = counts.get("checked_in", 0)
        waiting_count = counts.get("waiting", 0) + counts.get("arrived", 0)
        in_progress_count = counts.get("in_progress", 0)
        completed_count = counts.get("completed", 0)
        cancelled_count = counts.get("cancelled", 0)
        no_show_count = counts.get("no_show", 0)

        # 2. Open Tasks & Leads
        tasks, total_tasks = await self.task_repo.list_tasks(
            clinic_id=clinic_id, status="pending", limit=100
        )
        urgent_tasks = [
            t for t in tasks
            if t.priority in ("urgent", "high") or (t.title and t.title.startswith("Book follow-up:"))
        ]

        leads, total_leads = await self.lead_repo.list_leads(
            clinic_id=clinic_id, status="new", limit=100
        )

        # 3. Needs Attention items
        needs_attention = []

        # A. Unconfirmed appointments today
        for b in today_bookings:
            if b.status in ("requested", "unconfirmed"):
                needs_attention.append({
                    "id": str(b.id),
                    "type": "unconfirmed_appointment",
                    "title": f"Unconfirmed Visit: {b.patient_full_name}",
                    "subtitle": f"{b.preferred_time} today · {b.patient_phone}",
                    "actionRoute": f"/reception/appointments/confirmations",
                    "severity": "high",
                })

        # B. Late arrivals (arrived/scheduled > 15m ago without being in_progress)
        # C. Urgent tasks
        for t in urgent_tasks[:5]:
            needs_attention.append({
                "id": str(t.id),
                "type": "urgent_task",
                "title": f"Task: {t.title}",
                "subtitle": f"Priority: {t.priority.upper()}",
                "actionRoute": "/reception/tasks",
                "severity": "urgent",
            })

        # D. New leads
        for l in leads[:5]:
            needs_attention.append({
                "id": str(l.id),
                "type": "new_lead",
                "title": f"Inquiry from {l.full_name}",
                "subtitle": f"Phone: {l.phone}",
                "actionRoute": "/reception/leads",
                "severity": "medium",
            })

        # Recalls due count (patients without visit in 6 months)
        recalls_due = await self.get_recalls(clinic_id=clinic_id)

        return {
            "todayAppointments": total_today,
            "confirmedCount": confirmed_count,
            "unconfirmedCount": unconfirmed_count,
            "checkedInCount": checked_in_count,
            "waitingCount": waiting_count,
            "inProgressCount": in_progress_count,
            "completedCount": completed_count,
            "cancelledCount": cancelled_count,
            "noShowCount": no_show_count,
            "pendingRequestsCount": len([b for b in today_bookings if b.status == "requested"]),
            "urgentTasksCount": len(urgent_tasks),
            "newLeadsCount": total_leads,
            "recallsDueCount": len(recalls_due),
            "needsAttentionCount": len(needs_attention),
            "todayFlow": today_bookings,
            "needsAttentionItems": needs_attention,
        }

    async def list_schedule(
        self,
        clinic_id: Optional[UUID] = None,
        team_member_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Booking], int]:
        return await self.booking_repo.list_bookings(
            clinic_id=clinic_id,
            team_member_id=team_member_id,
            date_from=date_from,
            date_to=date_to,
            status=status,
            search=search,
            limit=limit,
            offset=offset,
        )

    async def get_service_duration(self, service_id: Optional[str]) -> int:
        if not service_id or not self.service_repo:
            return 30
        try:
            service_uuid = UUID(str(service_id))
            service = await self.service_repo.get_by_id(service_uuid)
            if service and service.duration:
                return parse_duration_to_minutes(service.duration)
        except (ValueError, TypeError):
            pass

        try:
            service = await self.service_repo.get_by_slug(str(service_id))
            if service and service.duration:
                return parse_duration_to_minutes(service.duration)
        except Exception:
            pass
        return 30

    async def check_booking_overlap(
        self,
        team_member_id: Optional[UUID],
        preferred_date: date,
        preferred_time: str,
        service_id: Optional[str] = None,
        exclude_booking_id: Optional[UUID] = None,
    ) -> Optional[Booking]:
        if not team_member_id:
            return None
        cand_start = parse_time_to_minutes(preferred_time)
        if cand_start is None:
            return None
        cand_duration = await self.get_service_duration(service_id)
        cand_end = cand_start + cand_duration

        existing_bookings, _ = await self.booking_repo.list_bookings(
            team_member_id=team_member_id,
            date_from=preferred_date,
            date_to=preferred_date,
            limit=200,
        )

        for b in existing_bookings:
            if exclude_booking_id and b.id == exclude_booking_id:
                continue
            if b.status in ("cancelled", "no_show", "waitlist"):
                continue
            b_start = parse_time_to_minutes(b.preferred_time)
            if b_start is None:
                continue
            b_dur = await self.get_service_duration(b.service_id)
            b_end = b_start + b_dur

            if cand_start < b_end and b_start < cand_end:
                return b
        return None

    async def create_booking(
        self,
        patient_full_name: str,
        patient_phone: str,
        patient_email: str,
        preferred_date: date,
        preferred_time: str,
        clinic_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        service_id: Optional[str] = None,
        team_member_id: Optional[UUID] = None,
        slot_id: Optional[UUID] = None,
        status: str = "confirmed",
        notes: Optional[str] = None,
        staff_notes: Optional[str] = None,
        override_double_booking: bool = False,
        override_reason: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> Booking:
        normalized_status = self.NORMALIZE_STATUS.get(status, status)

        # Enforce closed mode override requirement for reception booking
        if self.booking_settings_repo is not None:
            settings = await self.booking_settings_repo.get_settings()
            if settings.booking_mode == "closed":
                if not override_reason or not override_reason.strip():
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Clinic booking is currently closed. A recorded reason is required to override and schedule.",
                    )

        conflict = None
        async with _acquire_schedule_lock(self.booking_repo, team_member_id, preferred_date):
            if team_member_id and preferred_time and normalized_status not in ("cancelled", "no_show", "waitlist"):
                conflict = await self.check_booking_overlap(
                    team_member_id=team_member_id,
                    preferred_date=preferred_date,
                    preferred_time=preferred_time,
                    service_id=service_id,
                )
                if conflict:
                    if not override_double_booking:
                        raise HTTPException(
                            status_code=http_status.HTTP_409_CONFLICT,
                            detail=f"Double-booking conflict: Clinician already has an appointment scheduled at {conflict.preferred_time}.",
                        )
                    if not override_reason or not override_reason.strip():
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Override reason is required to override double-booking.",
                        )

            # If patient_id not provided, find or create patient record
            if not patient_id:
                dups = await self.patient_repo.find_duplicates(
                    first_name=patient_full_name.split()[0],
                    last_name=" ".join(patient_full_name.split()[1:]) if len(patient_full_name.split()) > 1 else "",
                    phone=patient_phone,
                    email=patient_email,
                    clinic_id=clinic_id,
                )
                if dups:
                    patient_id = dups[0].id
                else:
                    names = patient_full_name.split()
                    first = names[0] if names else "Patient"
                    last = " ".join(names[1:]) if len(names) > 1 else "Unknown"
                    new_pat = Patient(
                        first_name=first,
                        last_name=last,
                        phone=patient_phone,
                        email=patient_email,
                        clinic_id=clinic_id,
                    )
                    saved_pat = await self.patient_repo.save(new_pat)
                    patient_id = saved_pat.id

            booking = Booking(
                confirmation_id=generate_booking_confirmation_id(),
                preferred_date=preferred_date,
                preferred_time=preferred_time,
                patient_full_name=patient_full_name,
                patient_phone=patient_phone,
                patient_email=patient_email,
                clinic_id=clinic_id,
                patient_id=patient_id,
                service_id=service_id,
                team_member_id=team_member_id,
                slot_id=slot_id,
                status=normalized_status,
                notes=notes,
                staff_notes=staff_notes,
            )
            saved_booking = await self.booking_repo.save(booking)

        if conflict and override_double_booking:
            await record_activity(
                self.activity_repo,
                action="override_double_booking",
                entity_type="booking",
                entity_id=saved_booking.id,
                user_id=user_id,
                details={
                    "reason": override_reason.strip(),
                    "conflict_booking_id": str(conflict.id),
                    "conflict_time": conflict.preferred_time,
                    "preferred_date": str(preferred_date),
                    "team_member_id": str(team_member_id),
                },
            )

        await record_activity(
            self.activity_repo,
            action="booking_create",
            entity_type="booking",
            entity_id=saved_booking.id,
            user_id=user_id,
            details={
                "confirmation_id": saved_booking.confirmation_id,
                "patient_name": saved_booking.patient_full_name,
                "preferred_date": str(preferred_date),
                "preferred_time": preferred_time,
                "status": saved_booking.status,
            },
        )

        return saved_booking

    VALID_STATUSES = {
        "requested",
        "confirmed",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "waitlist",
    }

    NORMALIZE_STATUS = {
        "scheduled": "confirmed",
        "checked_in": "arrived",
        "waiting": "arrived",
    }

    ALLOWED_TRANSITIONS = {
        "requested": {"confirmed", "scheduled", "cancelled", "waitlist"},
        "confirmed": {"arrived", "checked_in", "waiting", "in_progress", "cancelled", "no_show", "waitlist", "confirmed"},
        "scheduled": {"arrived", "checked_in", "waiting", "in_progress", "cancelled", "no_show", "waitlist", "confirmed"},
        "arrived": {"in_progress", "completed", "cancelled", "no_show", "arrived"},
        "checked_in": {"in_progress", "completed", "cancelled", "no_show", "checked_in"},
        "waiting": {"in_progress", "completed", "cancelled", "no_show", "waiting"},
        "in_progress": {"completed", "cancelled", "in_progress"},
        "completed": {"completed"},
        "cancelled": {"requested", "confirmed", "scheduled", "cancelled"},
        "no_show": {"requested", "confirmed", "scheduled", "no_show"},
        "waitlist": {"confirmed", "scheduled", "cancelled", "waitlist"},
    }

    async def update_booking_status(
        self,
        booking_id: UUID,
        new_status: str,
        staff_notes: Optional[str] = None,
        cancellation_reason: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> Booking:
        normalized_new = self.NORMALIZE_STATUS.get(new_status, new_status)
        if normalized_new not in self.VALID_STATUSES:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status '{new_status}'. Allowed statuses: {sorted(list(self.VALID_STATUSES))}",
            )

        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Booking record not found."
            )

        allowed = self.ALLOWED_TRANSITIONS.get(booking.status, set())
        if new_status not in allowed and normalized_new not in allowed:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Cannot transition appointment from '{booking.status}' to '{new_status}'.",
            )

        now_utc = datetime.now(timezone.utc)

        if normalized_new == "arrived":
            if booking.arrived_at is None:
                booking.arrived_at = now_utc
        elif normalized_new == "in_progress":
            if booking.started_at is None:
                booking.started_at = now_utc
        elif normalized_new == "completed":
            if booking.completed_at is None:
                booking.completed_at = now_utc
        elif normalized_new == "cancelled":
            if not cancellation_reason or not cancellation_reason.strip():
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Cancellation reason is required when cancelling an appointment.",
                )
            booking.cancellation_reason = cancellation_reason.strip()
            booking.cancelled_by_user_id = user_id

        old_status = booking.status
        booking.status = normalized_new
        if staff_notes:
            booking.staff_notes = staff_notes
        saved = await self.booking_repo.save(booking)

        if normalized_new == "cancelled":
            await record_activity(
                self.activity_repo,
                action="booking_cancel",
                entity_type="booking",
                entity_id=saved.id,
                user_id=user_id,
                details={
                    "reason": cancellation_reason.strip() if cancellation_reason else None,
                    "old_status": old_status,
                },
            )
        elif normalized_new != old_status:
            await record_activity(
                self.activity_repo,
                action="booking_status_transition",
                entity_type="booking",
                entity_id=saved.id,
                user_id=user_id,
                details={
                    "from_status": old_status,
                    "to_status": normalized_new,
                },
            )

        return saved

    async def reschedule_booking(
        self,
        booking_id: UUID,
        preferred_date: date,
        preferred_time: str,
        team_member_id: Optional[UUID] = None,
        service_id: Optional[str] = None,
        slot_id: Optional[UUID] = None,
        staff_notes: Optional[str] = None,
        override_double_booking: bool = False,
        override_reason: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> Booking:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Booking record not found."
            )

        effective_team_member = team_member_id if team_member_id is not None else booking.team_member_id
        effective_service = service_id if service_id is not None else booking.service_id
        conflict = None
        async with _acquire_schedule_lock(self.booking_repo, effective_team_member, preferred_date):
            if effective_team_member and preferred_time:
                conflict = await self.check_booking_overlap(
                    team_member_id=effective_team_member,
                    preferred_date=preferred_date,
                    preferred_time=preferred_time,
                    service_id=effective_service,
                    exclude_booking_id=booking.id,
                )
                if conflict:
                    if not override_double_booking:
                        raise HTTPException(
                            status_code=http_status.HTTP_409_CONFLICT,
                            detail=f"Double-booking conflict: Clinician already has an appointment scheduled at {conflict.preferred_time}.",
                        )
                    if not override_reason or not override_reason.strip():
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Override reason is required to override double-booking.",
                        )

            booking.preferred_date = preferred_date
            booking.preferred_time = preferred_time
            if team_member_id is not None:
                booking.team_member_id = team_member_id
            if service_id is not None:
                booking.service_id = service_id
            if slot_id is not None:
                booking.slot_id = slot_id
            if staff_notes is not None:
                booking.staff_notes = staff_notes
            booking.status = "confirmed"
            saved_booking = await self.booking_repo.save(booking)

        if conflict and override_double_booking:
            await record_activity(
                self.activity_repo,
                action="override_double_booking",
                entity_type="booking",
                entity_id=saved_booking.id,
                user_id=user_id,
                details={
                    "reason": override_reason.strip(),
                    "conflict_booking_id": str(conflict.id),
                    "conflict_time": conflict.preferred_time,
                    "preferred_date": str(preferred_date),
                    "team_member_id": str(effective_team_member),
                },
            )

        await record_activity(
            self.activity_repo,
            action="booking_reschedule",
            entity_type="booking",
            entity_id=saved_booking.id,
            user_id=user_id,
            details={
                "preferred_date": str(preferred_date),
                "preferred_time": preferred_time,
                "team_member_id": str(effective_team_member) if effective_team_member else None,
            },
        )

        return saved_booking

    # --- Patients ---

    async def search_patients(
        self,
        query: Optional[str] = None,
        clinic_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Patient], int]:
        return await self.patient_repo.search(
            query=query, clinic_id=clinic_id, limit=limit, offset=offset
        )

    async def create_patient(
        self,
        first_name: str,
        last_name: str,
        phone: str,
        email: Optional[str] = None,
        date_of_birth: Optional[date] = None,
        clinic_id: Optional[UUID] = None,
        notes: Optional[str] = None,
        check_duplicate: bool = True,
        user_id: Optional[UUID] = None,
    ) -> Tuple[Patient, List[Patient]]:
        if check_duplicate:
            dups = await self.patient_repo.find_duplicates(
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                email=email,
                date_of_birth=date_of_birth,
                clinic_id=clinic_id,
            )
            if dups:
                return dups[0], dups
        else:
            await record_activity(
                self.activity_repo,
                action="deduplication_bypass",
                entity_type="patient",
                entity_id=None,
                user_id=user_id,
                details={
                    "first_name": first_name.strip(),
                    "last_name": last_name.strip(),
                    "phone": phone.strip(),
                },
            )

        patient = Patient(
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            phone=phone.strip(),
            email=email.strip().lower() if email else None,
            date_of_birth=date_of_birth,
            clinic_id=clinic_id,
            notes=notes,
        )
        saved = await self.patient_repo.save(patient)

        await record_activity(
            self.activity_repo,
            action="patient_create",
            entity_type="patient",
            entity_id=saved.id,
            user_id=user_id,
            details={"name": f"{saved.first_name} {saved.last_name}"},
        )

        return saved, []

    async def get_patient_profile(self, patient_id: UUID) -> Dict[str, Any]:
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Patient not found."
            )
        bookings = await self.booking_repo.get_patient_bookings(patient_id)
        today = datetime.now(timezone.utc).date()
        upcoming = [b for b in bookings if b.preferred_date >= today]
        past = [b for b in bookings if b.preferred_date < today]
        tasks = await self.task_repo.get_patient_tasks(patient_id)
        messages = await self.message_repo.get_patient_messages(patient_id)

        return {
            "patient": patient,
            "upcomingAppointments": upcoming,
            "pastAppointments": past,
            "tasks": tasks,
            "messages": messages,
        }

    async def update_patient(
        self, patient_id: UUID, updates: Dict[str, Any], user_id: Optional[UUID] = None
    ) -> Patient:
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Patient not found."
            )
        for k, v in updates.items():
            if hasattr(patient, k) and v is not None:
                setattr(patient, k, v)
        saved = await self.patient_repo.save(patient)

        await record_activity(
            self.activity_repo,
            action="patient_update",
            entity_type="patient",
            entity_id=saved.id,
            user_id=user_id,
            details={"updated_fields": list(updates.keys())},
        )

        return saved

    # --- Requests Triage Queue ---

    async def list_requests(
        self, clinic_id: Optional[UUID] = None
    ) -> List[Booking]:
        # Returns bookings with status 'requested'
        bookings, _ = await self.booking_repo.list_bookings(
            clinic_id=clinic_id, status="requested", limit=100
        )
        return bookings

    # --- Tasks ---

    async def list_tasks(
        self,
        clinic_id: Optional[UUID] = None,
        assigned_to_user_id: Optional[UUID] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Task], int]:
        return await self.task_repo.list_tasks(
            clinic_id=clinic_id,
            assigned_to_user_id=assigned_to_user_id,
            status=status,
            priority=priority,
            limit=limit,
            offset=offset,
        )

    async def create_task(
        self,
        title: str,
        clinic_id: Optional[UUID] = None,
        assigned_to_user_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        booking_id: Optional[UUID] = None,
        description: Optional[str] = None,
        priority: str = "medium",
        status: str = "pending",
        due_date: Optional[datetime] = None,
        user_id: Optional[UUID] = None,
    ) -> Task:
        normalized_status = "pending" if status == "open" else ("done" if status == "completed" else status)
        task = Task(
            title=title,
            clinic_id=clinic_id,
            assigned_to_user_id=assigned_to_user_id,
            patient_id=patient_id,
            booking_id=booking_id,
            description=description,
            priority=priority,
            status=normalized_status,
            due_date=due_date,
        )
        saved = await self.task_repo.save(task)

        await record_activity(
            self.activity_repo,
            action="task_create",
            entity_type="task",
            entity_id=saved.id,
            user_id=user_id,
            details={"title": saved.title, "priority": saved.priority},
        )

        return saved

    async def update_task(
        self, task_id: UUID, updates: Dict[str, Any], user_id: Optional[UUID] = None
    ) -> Task:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Task not found."
            )
        old_status = task.status
        for k, v in updates.items():
            if k == "status" and v is not None:
                v = "pending" if v == "open" else ("done" if v == "completed" else v)
            if hasattr(task, k) and v is not None:
                setattr(task, k, v)
        saved = await self.task_repo.save(task)

        if "status" in updates and saved.status != old_status:
            await record_activity(
                self.activity_repo,
                action="task_status_change",
                entity_type="task",
                entity_id=saved.id,
                user_id=user_id,
                details={"from_status": old_status, "to_status": saved.status},
            )
        else:
            await record_activity(
                self.activity_repo,
                action="task_update",
                entity_type="task",
                entity_id=saved.id,
                user_id=user_id,
                details={"updated_fields": list(updates.keys())},
            )

        return saved

    # --- Messages ---

    async def list_messages(
        self,
        clinic_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        recipient_id: Optional[UUID] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Message], int]:
        return await self.message_repo.list_messages(
            clinic_id=clinic_id,
            user_id=user_id,
            recipient_id=recipient_id,
            limit=limit,
            offset=offset,
        )

    async def create_message(
        self,
        content: str,
        sender_id: Optional[UUID] = None,
        recipient_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        channel: str = "sms",
        status: str = "logged",
    ) -> Message:
        msg = Message(
            content=content,
            sender_id=sender_id,
            recipient_id=recipient_id,
            patient_id=patient_id,
            phone=phone,
            email=email,
            channel=channel,
            status=status,
        )
        return await self.message_repo.save(msg)

    # --- Leads ---

    async def list_leads(
        self,
        clinic_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Lead], int]:
        return await self.lead_repo.list_leads(
            clinic_id=clinic_id, status=status, search=search, limit=limit, offset=offset
        )

    async def create_lead(
        self,
        full_name: str,
        phone: str,
        email: Optional[str] = None,
        clinic_id: Optional[UUID] = None,
        lead_source_id: Optional[UUID] = None,
        status: str = "new",
        notes: Optional[str] = None,
        utm_source: Optional[str] = None,
        utm_campaign: Optional[str] = None,
    ) -> Lead:
        lead = Lead(
            full_name=full_name,
            phone=phone,
            email=email,
            clinic_id=clinic_id,
            lead_source_id=lead_source_id,
            status=status,
            notes=notes,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
        )
        return await self.lead_repo.save(lead)

    async def update_lead(
        self, lead_id: UUID, updates: Dict[str, Any]
    ) -> Lead:
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Lead not found."
            )
        for k, v in updates.items():
            if hasattr(lead, k) and v is not None:
                setattr(lead, k, v)
        return await self.lead_repo.save(lead)

    async def convert_lead_to_patient(
        self,
        lead_id: UUID,
        date_of_birth: Optional[date] = None,
        clinic_id: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> Patient:
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Lead not found."
            )

        names = lead.full_name.split()
        first_name = names[0] if names else "Patient"
        last_name = " ".join(names[1:]) if len(names) > 1 else "Unknown"

        # Check existing duplicates to prevent double-patient creation
        patient, _ = await self.create_patient(
            first_name=first_name,
            last_name=last_name,
            phone=lead.phone,
            email=lead.email,
            date_of_birth=date_of_birth,
            clinic_id=clinic_id or lead.clinic_id,
            notes=notes or lead.notes,
            check_duplicate=True,
        )

        lead.status = "converted"
        lead.patient_id = patient.id
        await self.lead_repo.save(lead)
        return patient

    # --- Recalls ---

    async def get_recalls(
        self, clinic_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        # Derived recall list: patients who had a visit > 180 days ago and no future booking
        six_months_ago = datetime.now(timezone.utc).date() - timedelta(days=180)
        past_bookings, _ = await self.booking_repo.list_bookings(
            clinic_id=clinic_id,
            date_to=six_months_ago,
            status="completed",
            limit=50,
        )
        recalls = []
        for b in past_bookings:
            recalls.append({
                "patientId": str(b.patient_id) if b.patient_id else str(b.id),
                "patientFullName": b.patient_full_name,
                "phone": b.patient_phone,
                "email": b.patient_email,
                "lastVisitDate": b.preferred_date.isoformat(),
                "serviceId": b.service_id or "cleanings-exams",
                "status": "due",
                "clinicId": str(b.clinic_id) if b.clinic_id else None,
            })
        return recalls
