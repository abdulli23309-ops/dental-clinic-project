from fastapi import HTTPException, status as http_status
from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_settings import (
    AppointmentCategory,
    BookingSettings,
    CancellationRequest,
    ClinicClosure,
    DoctorScheduleOverride,
    ProviderAvailability,
    ProviderTimeOff,
    RescheduleRequest,
    ServiceProviderLink,
    TeamMemberClinic,
    WorkingHours,
)
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.infrastructure.database.orm_models import (
    ClinicServiceORM,
    ServiceORM,
    AppointmentCategoryORM,
    CancellationRequestORM,
    ClinicBookingSettingsORM,
    ClinicClosureORM,
    ClinicWorkingHoursORM,
    DoctorScheduleOverrideORM,
    ProviderAvailabilityORM,
    ProviderTimeOffORM,
    RescheduleRequestORM,
    ServiceProviderORM,
    TeamMemberClinicORM,
)


class PostgresBookingSettingsRepository(BookingSettingsRepository):
    """
    SQLAlchemy 2.0 PostgreSQL repository for working hours, booking settings, closures, and provider schedules.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_settings(self, clinic_id: Optional[UUID] = None) -> BookingSettings:
        orm = None
        if clinic_id:
            c_stmt = select(ClinicBookingSettingsORM).where(ClinicBookingSettingsORM.clinic_id == clinic_id).limit(1)
            c_res = await self.session.execute(c_stmt)
            orm = c_res.scalar_one_or_none()

        if not orm:
            p_stmt = select(ClinicBookingSettingsORM).where(
                ClinicBookingSettingsORM.clinic_id.is_(None) if clinic_id else True
            ).order_by(ClinicBookingSettingsORM.created_at.asc()).limit(1)
            p_res = await self.session.execute(p_stmt)
            orm = p_res.scalar_one_or_none()

        if not orm:
            return BookingSettings(
                id=uuid4(),
                booking_mode="open",
                advance_booking_days=60,
                min_lead_time_hours=2,
                slot_interval_minutes=15,
                file_number_prefix="MD-",
                clinic_id=clinic_id,
            )

        return BookingSettings(
            id=orm.id,
            booking_mode=orm.booking_mode,
            pause_message=orm.pause_message,
            pause_started_at=orm.pause_started_at,
            pause_started_by_user_id=orm.pause_started_by_user_id,
            resume_on=orm.resume_on,
            advance_booking_days=orm.advance_booking_days,
            min_lead_time_hours=getattr(orm, "min_lead_time_hours", 2) or 2,
            slot_interval_minutes=orm.slot_interval_minutes,
            reminder_template=getattr(orm, "reminder_template", None),
            reminder_template_urdu=getattr(orm, "reminder_template_urdu", None),
            reminder_24h_enabled=getattr(orm, "reminder_24h_enabled", True) if getattr(orm, "reminder_24h_enabled", None) is not None else True,
            reminder_2h_enabled=getattr(orm, "reminder_2h_enabled", True) if getattr(orm, "reminder_2h_enabled", None) is not None else True,
            waiting_threshold_minutes=getattr(orm, "waiting_threshold_minutes", 15) or 15,
            file_number_prefix=getattr(orm, "file_number_prefix", "MD-") or "MD-",
            payments_enabled=getattr(orm, "payments_enabled", True) if getattr(orm, "payments_enabled", None) is not None else True,
            quiet_hours_enabled=getattr(orm, "quiet_hours_enabled", True) if getattr(orm, "quiet_hours_enabled", None) is not None else True,
            quiet_hours_start=getattr(orm, "quiet_hours_start", "21:00") or "21:00",
            quiet_hours_end=getattr(orm, "quiet_hours_end", "08:00") or "08:00",
            messaging_provider_mode=getattr(orm, "messaging_provider_mode", "simulated") or "simulated",
            clinic_id=orm.clinic_id,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def update_settings(self, settings: BookingSettings) -> BookingSettings:
        stmt = select(ClinicBookingSettingsORM).where(ClinicBookingSettingsORM.id == settings.id)
        res = await self.session.execute(stmt)
        orm = res.scalar_one_or_none()
        if not orm:
            orm = ClinicBookingSettingsORM(id=settings.id)
            self.session.add(orm)

        orm.booking_mode = settings.booking_mode
        orm.pause_message = settings.pause_message
        orm.pause_started_at = settings.pause_started_at
        orm.pause_started_by_user_id = settings.pause_started_by_user_id
        orm.resume_on = settings.resume_on
        orm.advance_booking_days = settings.advance_booking_days
        orm.min_lead_time_hours = settings.min_lead_time_hours
        orm.slot_interval_minutes = settings.slot_interval_minutes
        orm.reminder_template = settings.reminder_template
        orm.reminder_template_urdu = getattr(settings, "reminder_template_urdu", None)
        orm.reminder_24h_enabled = getattr(settings, "reminder_24h_enabled", True)
        orm.reminder_2h_enabled = getattr(settings, "reminder_2h_enabled", True)
        orm.waiting_threshold_minutes = settings.waiting_threshold_minutes
        orm.file_number_prefix = getattr(settings, "file_number_prefix", "MD-") or "MD-"
        orm.payments_enabled = getattr(settings, "payments_enabled", True)
        orm.quiet_hours_enabled = getattr(settings, "quiet_hours_enabled", True)
        orm.quiet_hours_start = getattr(settings, "quiet_hours_start", "21:00") or "21:00"
        orm.quiet_hours_end = getattr(settings, "quiet_hours_end", "08:00") or "08:00"
        orm.messaging_provider_mode = getattr(settings, "messaging_provider_mode", "simulated") or "simulated"
        orm.clinic_id = settings.clinic_id
        orm.updated_at = datetime.now(timezone.utc)

        await self.session.flush()
        return BookingSettings(
            id=orm.id,
            booking_mode=orm.booking_mode,
            pause_message=orm.pause_message,
            pause_started_at=orm.pause_started_at,
            pause_started_by_user_id=orm.pause_started_by_user_id,
            resume_on=orm.resume_on,
            advance_booking_days=orm.advance_booking_days,
            min_lead_time_hours=orm.min_lead_time_hours,
            slot_interval_minutes=orm.slot_interval_minutes,
            reminder_template=orm.reminder_template,
            reminder_template_urdu=getattr(orm, "reminder_template_urdu", None),
            reminder_24h_enabled=getattr(orm, "reminder_24h_enabled", True),
            reminder_2h_enabled=getattr(orm, "reminder_2h_enabled", True),
            waiting_threshold_minutes=orm.waiting_threshold_minutes,
            file_number_prefix=getattr(orm, "file_number_prefix", "MD-") or "MD-",
            payments_enabled=getattr(orm, "payments_enabled", True),
            quiet_hours_enabled=getattr(orm, "quiet_hours_enabled", True),
            quiet_hours_start=getattr(orm, "quiet_hours_start", "21:00") or "21:00",
            quiet_hours_end=getattr(orm, "quiet_hours_end", "08:00") or "08:00",
            messaging_provider_mode=getattr(orm, "messaging_provider_mode", "simulated") or "simulated",
            clinic_id=orm.clinic_id,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def list_working_hours(self, clinic_id: Optional[UUID] = None) -> List[WorkingHours]:
        stmt = select(ClinicWorkingHoursORM)
        if clinic_id:
            stmt = stmt.where(ClinicWorkingHoursORM.clinic_id == clinic_id)
        stmt = stmt.order_by(ClinicWorkingHoursORM.day_of_week.asc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()

        if not orms:
            # Fallback default 7 days (Sunday closed) without writing to session during read
            defaults = [
                (0, "08:00", "18:00", False),
                (1, "08:00", "18:00", False),
                (2, "08:00", "18:00", False),
                (3, "08:00", "18:00", False),
                (4, "08:00", "14:00", False),
                (5, "09:00", "13:00", False),
                (6, None, None, True),
            ]
            return [
                WorkingHours(
                    id=uuid4(),
                    day_of_week=dow,
                    open_time=op_t,
                    close_time=cl_t,
                    is_closed=is_cl,
                    clinic_id=clinic_id,
                )
                for dow, op_t, cl_t, is_cl in defaults
            ]

        return [
            WorkingHours(
                id=o.id,
                day_of_week=o.day_of_week,
                open_time=o.open_time,
                close_time=o.close_time,
                is_closed=o.is_closed,
                is_24_hours=getattr(o, "is_24_hours", False) or False,
                periods_json=getattr(o, "periods_json", None),
                clinic_id=o.clinic_id,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def update_working_hours(self, hours: List[WorkingHours]) -> List[WorkingHours]:
        updated_list = []
        for h in hours:
            stmt = select(ClinicWorkingHoursORM).where(ClinicWorkingHoursORM.id == h.id)
            res = await self.session.execute(stmt)
            orm = res.scalar_one_or_none()
            if not orm:
                orm = ClinicWorkingHoursORM(
                    id=h.id,
                    clinic_id=h.clinic_id,
                    day_of_week=h.day_of_week,
                )
                self.session.add(orm)
            orm.open_time = h.open_time
            orm.close_time = h.close_time
            orm.is_closed = h.is_closed
            orm.is_24_hours = getattr(h, "is_24_hours", False) or False
            orm.periods_json = getattr(h, "periods_json", None)
            orm.updated_at = datetime.now(timezone.utc)
            await self.session.flush()
            updated_list.append(
                WorkingHours(
                    id=orm.id,
                    day_of_week=orm.day_of_week,
                    open_time=orm.open_time,
                    close_time=orm.close_time,
                    is_closed=orm.is_closed,
                    is_24_hours=getattr(orm, "is_24_hours", False) or False,
                    periods_json=getattr(orm, "periods_json", None),
                    clinic_id=orm.clinic_id,
                    created_at=orm.created_at,
                    updated_at=orm.updated_at,
                )
            )
        return updated_list

    async def list_closures(self, clinic_id: Optional[UUID] = None, future_only: bool = False) -> List[ClinicClosure]:
        stmt = select(ClinicClosureORM)
        if clinic_id:
            stmt = stmt.where(
                or_(
                    ClinicClosureORM.clinic_id == clinic_id,
                    ClinicClosureORM.clinic_id.is_(None),
                )
            )
        if future_only:
            today = date.today()
            stmt = stmt.where(ClinicClosureORM.end_date >= today)
        stmt = stmt.order_by(ClinicClosureORM.start_date.asc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            ClinicClosure(
                id=o.id,
                start_date=o.start_date,
                end_date=o.end_date,
                reason=o.reason,
                message=o.message,
                clinic_id=o.clinic_id,
                created_by_user_id=o.created_by_user_id,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def get_closure(self, closure_id: UUID) -> Optional[ClinicClosure]:
        stmt = select(ClinicClosureORM).where(ClinicClosureORM.id == closure_id)
        res = await self.session.execute(stmt)
        o = res.scalar_one_or_none()
        if not o:
            return None
        return ClinicClosure(
            id=o.id,
            start_date=o.start_date,
            end_date=o.end_date,
            reason=o.reason,
            message=o.message,
            clinic_id=o.clinic_id,
            created_by_user_id=o.created_by_user_id,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def save_closure(self, closure: ClinicClosure) -> ClinicClosure:
        stmt = select(ClinicClosureORM).where(ClinicClosureORM.id == closure.id)
        res = await self.session.execute(stmt)
        o = res.scalar_one_or_none()
        if not o:
            o = ClinicClosureORM(
                id=closure.id,
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(o)

        o.start_date = closure.start_date
        o.end_date = closure.end_date
        o.reason = closure.reason
        o.message = closure.message
        o.clinic_id = closure.clinic_id
        o.created_by_user_id = closure.created_by_user_id
        o.updated_at = datetime.now(timezone.utc)
        await self.session.flush()

        return ClinicClosure(
            id=o.id,
            start_date=o.start_date,
            end_date=o.end_date,
            reason=o.reason,
            message=o.message,
            clinic_id=o.clinic_id,
            created_by_user_id=o.created_by_user_id,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def delete_closure(self, closure_id: UUID) -> bool:
        stmt = delete(ClinicClosureORM).where(ClinicClosureORM.id == closure_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount > 0

    async def list_provider_availabilities(
        self,
        team_member_id: Optional[UUID] = None,
        clinic_id: Optional[UUID] = None,
    ) -> List[ProviderAvailability]:
        stmt = select(ProviderAvailabilityORM)
        if team_member_id:
            stmt = stmt.where(ProviderAvailabilityORM.team_member_id == team_member_id)
        if clinic_id:
            stmt = stmt.where(
                or_(
                    ProviderAvailabilityORM.clinic_id == clinic_id,
                    ProviderAvailabilityORM.clinic_id.is_(None),
                )
            )
        stmt = stmt.order_by(ProviderAvailabilityORM.day_of_week.asc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            ProviderAvailability(
                id=o.id,
                team_member_id=o.team_member_id,
                day_of_week=o.day_of_week,
                start_time=o.start_time,
                end_time=o.end_time,
                clinic_id=o.clinic_id,
                break_start_time=o.break_start_time,
                break_end_time=o.break_end_time,
                is_active=o.is_active,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def save_provider_availability(self, avail: ProviderAvailability) -> ProviderAvailability:
        stmt = select(ProviderAvailabilityORM).where(ProviderAvailabilityORM.id == avail.id)
        res = await self.session.execute(stmt)
        o = res.scalar_one_or_none()
        if not o:
            o = ProviderAvailabilityORM(
                id=avail.id,
                team_member_id=avail.team_member_id,
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(o)

        o.day_of_week = avail.day_of_week
        o.start_time = avail.start_time
        o.end_time = avail.end_time
        o.clinic_id = avail.clinic_id
        o.break_start_time = avail.break_start_time
        o.break_end_time = avail.break_end_time
        o.is_active = avail.is_active
        o.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return ProviderAvailability(
            id=o.id,
            team_member_id=o.team_member_id,
            day_of_week=o.day_of_week,
            start_time=o.start_time,
            end_time=o.end_time,
            clinic_id=o.clinic_id,
            break_start_time=o.break_start_time,
            break_end_time=o.break_end_time,
            is_active=o.is_active,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def delete_provider_availability(self, avail_id: UUID) -> bool:
        stmt = delete(ProviderAvailabilityORM).where(ProviderAvailabilityORM.id == avail_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount > 0

    async def list_provider_time_off(
        self,
        team_member_id: Optional[UUID] = None,
        future_only: bool = False,
    ) -> List[ProviderTimeOff]:
        stmt = select(ProviderTimeOffORM)
        if team_member_id:
            stmt = stmt.where(ProviderTimeOffORM.team_member_id == team_member_id)
        if future_only:
            today = date.today()
            stmt = stmt.where(ProviderTimeOffORM.end_date >= today)
        stmt = stmt.order_by(ProviderTimeOffORM.start_date.asc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            ProviderTimeOff(
                id=o.id,
                team_member_id=o.team_member_id,
                start_date=o.start_date,
                end_date=o.end_date,
                reason=o.reason,
                is_approved=o.is_approved,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def save_provider_time_off(self, time_off: ProviderTimeOff) -> ProviderTimeOff:
        stmt = select(ProviderTimeOffORM).where(ProviderTimeOffORM.id == time_off.id)
        res = await self.session.execute(stmt)
        o = res.scalar_one_or_none()
        if not o:
            o = ProviderTimeOffORM(
                id=time_off.id,
                team_member_id=time_off.team_member_id,
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(o)

        o.start_date = time_off.start_date
        o.end_date = time_off.end_date
        o.reason = time_off.reason
        o.is_approved = time_off.is_approved
        o.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return ProviderTimeOff(
            id=o.id,
            team_member_id=o.team_member_id,
            start_date=o.start_date,
            end_date=o.end_date,
            reason=o.reason,
            is_approved=o.is_approved,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def delete_provider_time_off(self, time_off_id: UUID) -> bool:
        stmt = delete(ProviderTimeOffORM).where(ProviderTimeOffORM.id == time_off_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount > 0

    async def list_service_providers(
        self,
        service_id: Optional[UUID] = None,
        team_member_id: Optional[UUID] = None,
        clinic_id: Optional[UUID] = None,
    ) -> List[ServiceProviderLink]:
        stmt = select(ServiceProviderORM).where(ServiceProviderORM.is_active.is_(True))
        if service_id:
            stmt = stmt.where(ServiceProviderORM.service_id == service_id)
        if team_member_id:
            stmt = stmt.where(ServiceProviderORM.team_member_id == team_member_id)
        if clinic_id:
            stmt = stmt.where(ServiceProviderORM.clinic_id == clinic_id)
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            ServiceProviderLink(
                id=o.id,
                service_id=o.service_id,
                team_member_id=o.team_member_id,
                clinic_id=o.clinic_id,
                custom_duration_minutes=o.custom_duration_minutes,
                buffer_minutes=o.buffer_minutes,
                is_active=o.is_active,
                created_at=o.created_at,
            )
            for o in orms
        ]

    async def set_service_providers(
        self,
        service_id: UUID,
        team_member_ids: List[UUID],
        clinic_id: UUID,
    ) -> None:
        if clinic_id is None:
            raise ValueError("clinic_id is required; branch-unscoped service provider assignment is forbidden.")

        cs_stmt = select(ClinicServiceORM).where(
            ClinicServiceORM.service_id == service_id,
            ClinicServiceORM.clinic_id == clinic_id,
            ClinicServiceORM.is_active.is_(True),
        )
        cs_res = await self.session.execute(cs_stmt)
        if cs_res.scalar_one_or_none() is None:
            svc = await self.session.get(ServiceORM, service_id)
            slug = svc.slug if svc and svc.slug else str(service_id)
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Service '{slug}' is not offered at this branch. Add it to branch services first.",
            )

        del_stmt = delete(ServiceProviderORM).where(
            ServiceProviderORM.service_id == service_id,
            ServiceProviderORM.clinic_id == clinic_id,
        )
        await self.session.execute(del_stmt)
        for tm_id in team_member_ids:
            self.session.add(
                ServiceProviderORM(
                    service_id=service_id,
                    team_member_id=tm_id,
                    clinic_id=clinic_id,
                    created_at=datetime.now(timezone.utc),
                )
            )
        await self.session.flush()


    async def list_doctor_overrides(
        self,
        team_member_id: Optional[UUID] = None,
        clinic_id: Optional[UUID] = None,
        include_draft: bool = True,
    ) -> List[DoctorScheduleOverride]:
        stmt = select(DoctorScheduleOverrideORM)
        if team_member_id:
            stmt = stmt.where(DoctorScheduleOverrideORM.team_member_id == team_member_id)
        if clinic_id:
            stmt = stmt.where(or_(DoctorScheduleOverrideORM.clinic_id.is_(None), DoctorScheduleOverrideORM.clinic_id == clinic_id))
        if not include_draft:
            stmt = stmt.where(DoctorScheduleOverrideORM.is_draft.is_(False))
        stmt = stmt.order_by(DoctorScheduleOverrideORM.override_date.asc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            DoctorScheduleOverride(
                id=o.id,
                team_member_id=o.team_member_id,
                clinic_id=o.clinic_id,
                override_date=o.override_date,
                override_type=o.override_type,
                is_draft=o.is_draft,
                shifts_json=o.shifts_json,
                breaks_json=o.breaks_json,
                reason=o.reason,
                published_at=o.published_at,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def save_doctor_override(self, override: DoctorScheduleOverride) -> DoctorScheduleOverride:
        stmt = select(DoctorScheduleOverrideORM).where(DoctorScheduleOverrideORM.id == override.id)
        res = await self.session.execute(stmt)
        o = res.scalar_one_or_none()
        if not o:
            o = DoctorScheduleOverrideORM(
                id=override.id,
                team_member_id=override.team_member_id,
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(o)

        o.clinic_id = override.clinic_id
        o.override_date = override.override_date
        o.override_type = override.override_type
        o.is_draft = override.is_draft
        o.shifts_json = override.shifts_json
        o.breaks_json = override.breaks_json
        o.reason = override.reason
        o.published_at = override.published_at
        o.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return DoctorScheduleOverride(
            id=o.id,
            team_member_id=o.team_member_id,
            clinic_id=o.clinic_id,
            override_date=o.override_date,
            override_type=o.override_type,
            is_draft=o.is_draft,
            shifts_json=o.shifts_json,
            breaks_json=o.breaks_json,
            reason=o.reason,
            published_at=o.published_at,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def delete_doctor_override(self, override_id: UUID) -> bool:
        stmt = delete(DoctorScheduleOverrideORM).where(DoctorScheduleOverrideORM.id == override_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount > 0

    async def list_doctor_branches(
        self,
        team_member_id: Optional[UUID] = None,
        clinic_id: Optional[UUID] = None,
    ) -> List[TeamMemberClinic]:
        stmt = select(TeamMemberClinicORM)
        if team_member_id:
            stmt = stmt.where(TeamMemberClinicORM.team_member_id == team_member_id)
        if clinic_id:
            stmt = stmt.where(TeamMemberClinicORM.clinic_id == clinic_id)
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            TeamMemberClinic(
                id=o.id,
                team_member_id=o.team_member_id,
                clinic_id=o.clinic_id,
                is_active=o.is_active,
                is_primary=o.is_primary,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def set_doctor_branches(
        self,
        team_member_id: UUID,
        clinic_ids: List[UUID],
        primary_clinic_id: Optional[UUID] = None,
    ) -> None:
        del_stmt = delete(TeamMemberClinicORM).where(TeamMemberClinicORM.team_member_id == team_member_id)
        await self.session.execute(del_stmt)
        for cid in clinic_ids:
            self.session.add(
                TeamMemberClinicORM(
                    team_member_id=team_member_id,
                    clinic_id=cid,
                    is_active=True,
                    is_primary=(cid == primary_clinic_id),
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
            )
        await self.session.flush()

    async def list_appointment_categories(self, include_inactive: bool = False) -> List[AppointmentCategory]:
        stmt = select(AppointmentCategoryORM)
        if not include_inactive:
            stmt = stmt.where(AppointmentCategoryORM.is_active.is_(True))
        stmt = stmt.order_by(AppointmentCategoryORM.name.asc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            AppointmentCategory(
                id=o.id,
                name=o.name,
                code=o.code,
                description=o.description,
                requires_approval=o.requires_approval,
                is_active=o.is_active,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def get_appointment_category(self, category_id: UUID) -> Optional[AppointmentCategory]:
        o = await self.session.get(AppointmentCategoryORM, category_id)
        if not o:
            return None
        return AppointmentCategory(
            id=o.id,
            name=o.name,
            code=o.code,
            description=o.description,
            requires_approval=o.requires_approval,
            is_active=o.is_active,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def save_appointment_category(self, category: AppointmentCategory) -> AppointmentCategory:
        stmt = select(AppointmentCategoryORM).where(AppointmentCategoryORM.id == category.id)
        res = await self.session.execute(stmt)
        o = res.scalar_one_or_none()
        if not o:
            o = AppointmentCategoryORM(
                id=category.id,
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(o)

        o.name = category.name
        o.code = category.code
        o.description = category.description
        o.requires_approval = category.requires_approval
        o.is_active = category.is_active
        o.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return AppointmentCategory(
            id=o.id,
            name=o.name,
            code=o.code,
            description=o.description,
            requires_approval=o.requires_approval,
            is_active=o.is_active,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def delete_appointment_category(self, category_id: UUID) -> bool:
        stmt = delete(AppointmentCategoryORM).where(AppointmentCategoryORM.id == category_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount > 0

    async def create_reschedule_request(self, req: RescheduleRequest) -> RescheduleRequest:
        o = RescheduleRequestORM(
            id=req.id,
            booking_id=req.booking_id,
            requested_date=req.requested_date,
            requested_time=req.requested_time,
            status=req.status,
            reason=req.reason,
            staff_notes=req.staff_notes,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(o)
        await self.session.flush()
        return req

    async def list_reschedule_requests(self, booking_id: Optional[UUID] = None, status: Optional[str] = None) -> List[RescheduleRequest]:
        stmt = select(RescheduleRequestORM)
        if booking_id:
            stmt = stmt.where(RescheduleRequestORM.booking_id == booking_id)
        if status:
            stmt = stmt.where(RescheduleRequestORM.status == status)
        stmt = stmt.order_by(RescheduleRequestORM.created_at.desc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            RescheduleRequest(
                id=o.id,
                booking_id=o.booking_id,
                requested_date=o.requested_date,
                requested_time=o.requested_time,
                status=o.status,
                reason=o.reason,
                staff_notes=o.staff_notes,
                reviewed_by_user_id=o.reviewed_by_user_id,
                reviewed_at=o.reviewed_at,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def get_reschedule_request(self, request_id: UUID) -> Optional[RescheduleRequest]:
        o = await self.session.get(RescheduleRequestORM, request_id)
        if not o:
            return None
        return RescheduleRequest(
            id=o.id,
            booking_id=o.booking_id,
            requested_date=o.requested_date,
            requested_time=o.requested_time,
            status=o.status,
            reason=o.reason,
            staff_notes=o.staff_notes,
            reviewed_by_user_id=o.reviewed_by_user_id,
            reviewed_at=o.reviewed_at,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def update_reschedule_request(self, req: RescheduleRequest) -> RescheduleRequest:
        o = await self.session.get(RescheduleRequestORM, req.id)
        if not o:
            raise ValueError("Reschedule request not found")
        o.status = req.status
        o.staff_notes = req.staff_notes
        o.reviewed_by_user_id = req.reviewed_by_user_id
        o.reviewed_at = req.reviewed_at
        o.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return req

    async def create_cancellation_request(self, req: CancellationRequest) -> CancellationRequest:
        o = CancellationRequestORM(
            id=req.id,
            booking_id=req.booking_id,
            reason=req.reason,
            status=req.status,
            hours_before_appointment=req.hours_before_appointment,
            is_auto_accepted=req.is_auto_accepted,
            staff_notes=req.staff_notes,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(o)
        await self.session.flush()
        return req

    async def list_cancellation_requests(self, booking_id: Optional[UUID] = None, status: Optional[str] = None) -> List[CancellationRequest]:
        stmt = select(CancellationRequestORM)
        if booking_id:
            stmt = stmt.where(CancellationRequestORM.booking_id == booking_id)
        if status:
            stmt = stmt.where(CancellationRequestORM.status == status)
        stmt = stmt.order_by(CancellationRequestORM.created_at.desc())
        res = await self.session.execute(stmt)
        orms = res.scalars().all()
        return [
            CancellationRequest(
                id=o.id,
                booking_id=o.booking_id,
                reason=o.reason,
                status=o.status,
                hours_before_appointment=o.hours_before_appointment,
                is_auto_accepted=o.is_auto_accepted,
                staff_notes=o.staff_notes,
                reviewed_by_user_id=o.reviewed_by_user_id,
                reviewed_at=o.reviewed_at,
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
            for o in orms
        ]

    async def get_cancellation_request(self, request_id: UUID) -> Optional[CancellationRequest]:
        o = await self.session.get(CancellationRequestORM, request_id)
        if not o:
            return None
        return CancellationRequest(
            id=o.id,
            booking_id=o.booking_id,
            reason=o.reason,
            status=o.status,
            hours_before_appointment=o.hours_before_appointment,
            is_auto_accepted=o.is_auto_accepted,
            staff_notes=o.staff_notes,
            reviewed_by_user_id=o.reviewed_by_user_id,
            reviewed_at=o.reviewed_at,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )

    async def update_cancellation_request(self, req: CancellationRequest) -> CancellationRequest:
        o = await self.session.get(CancellationRequestORM, req.id)
        if not o:
            raise ValueError("Cancellation request not found")
        o.status = req.status
        o.staff_notes = req.staff_notes
        o.reviewed_by_user_id = req.reviewed_by_user_id
        o.reviewed_at = req.reviewed_at
        o.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return req
