from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Union
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.public_booking_dto import (
    PublicBookingClinicItemDto,
    PublicBookingDoctorItemDto,
    PublicBookingServiceItemDto,
    WeeklyScheduleItemDto,
)
from app.application.services.availability_service import AvailabilityService
from app.domain.repositories.booking_flow_settings_repo import BookingFlowSettingsRepository
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.domain.repositories.clinic_service_repo import ClinicServiceRepository
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicORM,
    ClinicServiceORM,
    ProviderAvailabilityORM,
    ServiceORM,
    TeamMemberORM,
)


DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


@dataclass
class BookabilityEvaluation:
    service_id: UUID
    service_slug: str
    service_title: str
    clinic_id: Optional[UUID]
    is_eligible: bool
    status: str  # "eligible" | "ineligible"
    reasons: List[str] = field(default_factory=list)
    eligible_clinics: List[UUID] = field(default_factory=list)
    eligible_doctors: List[UUID] = field(default_factory=list)
    first_available_date: Optional[date] = None
    first_available_slot: Optional[str] = None


class BookingEligibilityService:
    """
    Unified business logic engine for service, clinic, and doctor booking eligibility.
    Enforces the single-source-of-truth rules from BOOKING_FLOW_SPEC.md:
    1. Service active, public, and bookable online.
    2. Clinic offers service actively in clinic_services.
    3. Doctor can perform service at that clinic (empty provider set = all active doctors at clinic).
    4. Availability slots exist within the horizon window.
    Returns structured diagnostic reasons (NO_ACTIVE_CLINIC, NO_ELIGIBLE_DOCTOR, NO_SLOTS_IN_HORIZON)
    for public filtering and admin bookability checks.
    """

    def __init__(
        self,
        session: AsyncSession,
        clinic_service_repo: ClinicServiceRepository,
        booking_flow_settings_repo: BookingFlowSettingsRepository,
        booking_settings_repo: BookingSettingsRepository,
        availability_service: AvailabilityService,
        timezone_str: str = "Asia/Karachi",
    ):
        self.session = session
        self.clinic_service_repo = clinic_service_repo
        self.booking_flow_settings_repo = booking_flow_settings_repo
        self.booking_settings_repo = booking_settings_repo
        self.availability_service = availability_service
        try:
            self.tz = ZoneInfo(timezone_str)
        except Exception:
            self.tz = timezone(timedelta(hours=5))

    async def _resolve_service(self, service_id: Union[UUID, str]) -> Optional[ServiceORM]:
        """Looks up a service entity by UUID or slug string."""
        if isinstance(service_id, UUID):
            return await self.session.get(ServiceORM, service_id)
        clean = str(service_id).strip()
        try:
            u = UUID(clean)
            return await self.session.get(ServiceORM, u)
        except (ValueError, TypeError):
            stmt = select(ServiceORM).where(ServiceORM.slug == clean.lower())
            res = await self.session.execute(stmt)
            return res.scalar_one_or_none()

    async def get_patients_treated_count(self, team_member_id: UUID) -> Optional[int]:
        """
        Computes distinct patients with completed visits for a doctor.
        Omitted (returns None) if switched off globally or per doctor.
        """
        flow_settings = await self.booking_flow_settings_repo.get_settings()
        if not flow_settings.show_patients_treated:
            return None

        tm = await self.session.get(TeamMemberORM, team_member_id)
        if not tm or not getattr(tm, "show_patients_treated", True):
            return None

        # Count distinct patient_id or phone from completed bookings
        stmt = (
            select(
                func.count(
                    func.distinct(
                        func.coalesce(
                            cast(BookingORM.patient_id, String),
                            BookingORM.patient_phone,
                        )
                    )
                )
            )
            .where(
                BookingORM.team_member_id == team_member_id,
                BookingORM.status == "completed",
            )
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() or 0

    async def get_doctor_weekly_schedule(
        self,
        team_member_id: UUID,
        clinic_id: Optional[UUID] = None,
    ) -> Tuple[List[WeeklyScheduleItemDto], str]:
        """
        Builds weekly schedule day-by-day items and human-readable summary for a doctor.
        """
        avails = await self.booking_settings_repo.list_provider_availabilities(team_member_id=team_member_id)
        # If clinic_id is present and provider availability rows have clinic_id, we can filter,
        # otherwise use all active availabilities for that clinician
        active_avails = [a for a in avails if a.is_active]

        schedule_items: List[WeeklyScheduleItemDto] = []
        working_days = []

        if active_avails:
            for dow in range(7):
                match = next((a for a in active_avails if a.day_of_week == dow), None)
                if match:
                    schedule_items.append(
                        WeeklyScheduleItemDto(
                            dayOfWeek=dow,
                            dayName=DAY_NAMES[dow],
                            startTime=match.start_time,
                            endTime=match.end_time,
                            isWorking=True,
                        )
                    )
                    working_days.append(f"{DAY_NAMES[dow][:3]} {match.start_time}-{match.end_time}")
                else:
                    schedule_items.append(
                        WeeklyScheduleItemDto(
                            dayOfWeek=dow,
                            dayName=DAY_NAMES[dow],
                            startTime=None,
                            endTime=None,
                            isWorking=False,
                        )
                    )
        else:
            # Fallback to clinic working hours
            wh_list = await self.booking_settings_repo.list_working_hours(clinic_id=clinic_id)
            for dow in range(7):
                wh = next((h for h in wh_list if h.day_of_week == dow), None)
                is_open = wh is not None and not wh.is_closed and wh.open_time and wh.close_time
                schedule_items.append(
                    WeeklyScheduleItemDto(
                        dayOfWeek=dow,
                        dayName=DAY_NAMES[dow],
                        startTime=wh.open_time if is_open else None,
                        endTime=wh.close_time if is_open else None,
                        isWorking=bool(is_open),
                    )
                )
                if is_open:
                    working_days.append(f"{DAY_NAMES[dow][:3]} {wh.open_time}-{wh.close_time}")

        summary = ", ".join(working_days) if working_days else "Schedule by appointment"
        return schedule_items, summary

    async def check_service_bookability(
        self,
        service_id: Union[UUID, str],
        clinic_id: Optional[UUID] = None,
        horizon_days: Optional[int] = None,
    ) -> BookabilityEvaluation:
        """
        Unified service bookability check.
        Evaluates active status, clinic_services links, doctor assignment, and slots in horizon.
        """
        svc = await self._resolve_service(service_id)
        if not svc or not svc.is_active or not svc.is_public or not getattr(svc, "bookable_online", True):
            return BookabilityEvaluation(
                service_id=svc.id if svc else UUID("00000000-0000-0000-0000-000000000000"),
                service_slug=svc.slug if svc else str(service_id),
                service_title=svc.title if svc else "Unknown Service",
                clinic_id=clinic_id,
                is_eligible=False,
                status="ineligible",
                reasons=["SERVICE_INACTIVE"],
            )

        flow_settings = await self.booking_flow_settings_repo.get_settings()
        horizon = min(max(1, horizon_days or flow_settings.days_shown or 7), 14)
        today_local = datetime.now(self.tz).date()

        # 1. Determine candidate clinics offering the service actively
        if clinic_id:
            clinic = await self.session.get(ClinicORM, clinic_id)
            if not clinic or not clinic.is_active:
                return BookabilityEvaluation(
                    service_id=svc.id,
                    service_slug=svc.slug,
                    service_title=svc.title,
                    clinic_id=clinic_id,
                    is_eligible=False,
                    status="ineligible",
                    reasons=["NO_ACTIVE_CLINIC"],
                )
            is_offered = await self.clinic_service_repo.is_service_offered(clinic_id, svc.id)
            if not is_offered:
                return BookabilityEvaluation(
                    service_id=svc.id,
                    service_slug=svc.slug,
                    service_title=svc.title,
                    clinic_id=clinic_id,
                    is_eligible=False,
                    status="ineligible",
                    reasons=["NO_ACTIVE_CLINIC"],
                )
            candidate_clinics = [clinic]
        else:
            links = await self.clinic_service_repo.list_by_service(svc.id)
            if not links:
                return BookabilityEvaluation(
                    service_id=svc.id,
                    service_slug=svc.slug,
                    service_title=svc.title,
                    clinic_id=None,
                    is_eligible=False,
                    status="ineligible",
                    reasons=["NO_ACTIVE_CLINIC"],
                )
            clinic_ids = [l.clinic_id for l in links]
            c_res = await self.session.execute(
                select(ClinicORM).where(
                    ClinicORM.id.in_(clinic_ids),
                    ClinicORM.is_active.is_(True),
                )
            )
            candidate_clinics = list(c_res.scalars().all())
            if not candidate_clinics:
                return BookabilityEvaluation(
                    service_id=svc.id,
                    service_slug=svc.slug,
                    service_title=svc.title,
                    clinic_id=None,
                    is_eligible=False,
                    status="ineligible",
                    reasons=["NO_ACTIVE_CLINIC"],
                )

        # 2. Check doctor assignment per spec:
        # Doctors are linked to services via service_providers.
        # If a service has no provider rows, every active doctor at that clinic can perform it.
        provider_links = await self.booking_settings_repo.list_service_providers(service_id=svc.id)
        linked_provider_ids = [l.team_member_id for l in provider_links]

        eligible_clinics: List[UUID] = []
        eligible_doctors: List[UUID] = []
        first_date: Optional[date] = None
        first_slot: Optional[str] = None
        reasons_accumulated: List[str] = []

        for clinic in candidate_clinics:
            # Query active doctors for this clinic (assigned directly or scheduled on shifts)
            shift_subquery = (
                select(ProviderAvailabilityORM.team_member_id)
                .where(ProviderAvailabilityORM.clinic_id == clinic.id)
            )
            doctor_stmt = select(TeamMemberORM).where(
                TeamMemberORM.is_active.is_(True),
                or_(
                    TeamMemberORM.clinic_id == clinic.id,
                    TeamMemberORM.location_id == clinic.id,
                    TeamMemberORM.clinic_id.is_(None),
                    TeamMemberORM.id.in_(shift_subquery),
                ),
            )
            d_res = await self.session.execute(doctor_stmt)
            active_clinic_doctors = list(d_res.scalars().all())

            if linked_provider_ids:
                qualified_doctors = [
                    d for d in active_clinic_doctors if d.id in linked_provider_ids
                ]
            else:
                # Empty provider set = all active doctors at that clinic
                qualified_doctors = active_clinic_doctors

            if not qualified_doctors:
                if "NO_ELIGIBLE_DOCTOR" not in reasons_accumulated:
                    reasons_accumulated.append("NO_ELIGIBLE_DOCTOR")
                continue

            # 3. Check upcoming availability slots in the horizon window
            clinic_has_slot = False
            for doc in qualified_doctors:
                for day_idx in range(horizon):
                    target_date = today_local + timedelta(days=day_idx)
                    slots = await self.availability_service.get_available_slots(
                        target_date=target_date,
                        service_id=svc.id,
                        team_member_id=doc.id,
                        clinic_id=clinic.id,
                    )
                    if slots:
                        clinic_has_slot = True
                        if doc.id not in eligible_doctors:
                            eligible_doctors.append(doc.id)
                        if first_date is None or target_date < first_date:
                            first_date = target_date
                            first_slot = slots[0]
                        break  # doctor has at least one slot

            if clinic_has_slot:
                eligible_clinics.append(clinic.id)
            else:
                if "NO_SLOTS_IN_HORIZON" not in reasons_accumulated:
                    reasons_accumulated.append("NO_SLOTS_IN_HORIZON")

        if eligible_clinics and eligible_doctors:
            return BookabilityEvaluation(
                service_id=svc.id,
                service_slug=svc.slug,
                service_title=svc.title,
                clinic_id=clinic_id,
                is_eligible=True,
                status="eligible",
                reasons=[],
                eligible_clinics=eligible_clinics,
                eligible_doctors=eligible_doctors,
                first_available_date=first_date,
                first_available_slot=first_slot,
            )

        # Ineligible
        final_reasons = reasons_accumulated or ["NO_SLOTS_IN_HORIZON"]
        return BookabilityEvaluation(
            service_id=svc.id,
            service_slug=svc.slug,
            service_title=svc.title,
            clinic_id=clinic_id,
            is_eligible=False,
            status="ineligible",
            reasons=final_reasons,
            eligible_clinics=eligible_clinics,
            eligible_doctors=eligible_doctors,
        )

    async def get_bookable_services(self) -> List[PublicBookingServiceItemDto]:
        """
        Returns only catalog procedures that are currently bookable at some clinic.
        """
        stmt = (
            select(ServiceORM)
            .where(
                ServiceORM.is_active.is_(True),
                ServiceORM.is_public.is_(True),
                ServiceORM.bookable_online.is_(True),
            )
            .order_by(ServiceORM.display_order.asc(), ServiceORM.title.asc())
        )
        res = await self.session.execute(stmt)
        services = res.scalars().all()

        bookable: List[PublicBookingServiceItemDto] = []
        for s in services:
            evaluation = await self.check_service_bookability(s.id)
            if evaluation.is_eligible:
                bookable.append(
                    PublicBookingServiceItemDto(
                        id=s.id,
                        slug=s.slug,
                        title=s.title,
                        shortDesc=s.short_desc,
                        fullDesc=s.full_desc,
                        category=s.category,
                        duration=s.duration,
                        cashPrice=s.cash_price,
                        displayOrder=s.display_order,
                        isHighlighted=s.is_highlighted,
                    )
                )
        return bookable

    async def get_bookable_clinics_for_service(
        self,
        service_id: Union[UUID, str],
        horizon_days: Optional[int] = None,
    ) -> List[PublicBookingClinicItemDto]:
        """
        Returns only clinics offering the specified service, with an eligible doctor and upcoming slots.
        """
        svc = await self._resolve_service(service_id)
        if not svc:
            return []

        # Find clinics offering this service
        links = await self.clinic_service_repo.list_by_service(svc.id)
        if not links:
            return []

        clinic_ids = [l.clinic_id for l in links]
        c_res = await self.session.execute(
            select(ClinicORM)
            .where(
                ClinicORM.id.in_(clinic_ids),
                ClinicORM.is_active.is_(True),
            )
            .order_by(ClinicORM.display_order.asc(), ClinicORM.name.asc())
        )
        clinics = list(c_res.scalars().all())

        results: List[PublicBookingClinicItemDto] = []
        for clinic in clinics:
            evaluation = await self.check_service_bookability(
                svc.id,
                clinic_id=clinic.id,
                horizon_days=horizon_days,
            )
            if evaluation.is_eligible:
                results.append(
                    PublicBookingClinicItemDto(
                        id=clinic.id,
                        name=clinic.name,
                        addressLine1=clinic.address_line1,
                        addressLine2=clinic.address_line2,
                        city=clinic.city,
                        state=clinic.state,
                        postalCode=clinic.postal_code,
                        firstAvailableDate=evaluation.first_available_date,
                    )
                )
        return results

    async def get_bookable_doctors_for_service_and_clinic(
        self,
        service_id: Union[UUID, str],
        clinic_id: UUID,
        days: Optional[int] = None,
    ) -> List[PublicBookingDoctorItemDto]:
        """
        Returns doctor profiles, patients treated count, weekly schedule summary,
        and slots by date for next N days (N from settings, max 14).
        """
        svc = await self._resolve_service(service_id)
        if not svc:
            return []

        flow_settings = await self.booking_flow_settings_repo.get_settings()
        n_days = min(max(1, days or flow_settings.days_shown or 7), 14)
        today_local = datetime.now(self.tz).date()

        # Check clinic offers service
        is_offered = await self.clinic_service_repo.is_service_offered(clinic_id, svc.id)
        if not is_offered:
            return []

        # Find qualified doctors
        provider_links = await self.booking_settings_repo.list_service_providers(service_id=svc.id)
        linked_ids = [l.team_member_id for l in provider_links]

        shift_subquery = (
            select(ProviderAvailabilityORM.team_member_id)
            .where(ProviderAvailabilityORM.clinic_id == clinic_id)
        )
        doc_stmt = select(TeamMemberORM).where(
            TeamMemberORM.is_active.is_(True),
            or_(
                TeamMemberORM.clinic_id == clinic_id,
                TeamMemberORM.location_id == clinic_id,
                TeamMemberORM.clinic_id.is_(None),
                TeamMemberORM.id.in_(shift_subquery),
            ),
        ).order_by(TeamMemberORM.display_order.asc(), TeamMemberORM.display_name.asc())

        d_res = await self.session.execute(doc_stmt)
        clinic_doctors = list(d_res.scalars().all())

        if linked_ids:
            doctors = [d for d in clinic_doctors if d.id in linked_ids]
        else:
            doctors = clinic_doctors

        results: List[PublicBookingDoctorItemDto] = []

        for doc in doctors:
            # Generate slots by date for next N days
            slots_by_date: Dict[str, List[str]] = {}
            total_slots = 0
            for day_idx in range(n_days):
                target_date = today_local + timedelta(days=day_idx)
                date_str = target_date.isoformat()
                slots = await self.availability_service.get_available_slots(
                    target_date=target_date,
                    service_id=svc.id,
                    team_member_id=doc.id,
                    clinic_id=clinic_id,
                )
                slots_by_date[date_str] = slots
                total_slots += len(slots)

            # Doctor must have upcoming availability to be shown
            if total_slots == 0:
                continue

            # Distinct patients treated count
            treated_count = await self.get_patients_treated_count(doc.id)

            # Weekly schedule
            weekly_items, weekly_summary = await self.get_doctor_weekly_schedule(
                doc.id, clinic_id=clinic_id
            )

            # Parse specialties
            specs: List[str] = []
            if doc.specialties_json:
                try:
                    import json
                    parsed = json.loads(doc.specialties_json)
                    if isinstance(parsed, list):
                        specs = [str(x) for x in parsed]
                except Exception:
                    pass

            results.append(
                PublicBookingDoctorItemDto(
                    id=doc.id,
                    displayName=doc.display_name,
                    professionalTitle=doc.professional_title,
                    role=doc.role,
                    biography=doc.biography,
                    photoUrl=doc.photo_url,
                    specialties=specs,
                    education=doc.education,
                    patientsTreated=treated_count,
                    weeklySchedule=weekly_items,
                    weeklyScheduleSummary=weekly_summary,
                    slotsByDate=slots_by_date,
                )
            )

        return results
