from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_settings import BookingSettings, ClinicClosure, WorkingHours
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.infrastructure.database.orm_models import (
    ClinicBookingSettingsORM,
    ClinicClosureORM,
    ClinicWorkingHoursORM,
)


class PostgresBookingSettingsRepository(BookingSettingsRepository):
    """
    SQLAlchemy 2.0 PostgreSQL repository for working hours, booking settings, and closures.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_settings(self, clinic_id: Optional[UUID] = None) -> BookingSettings:
        stmt = select(ClinicBookingSettingsORM)
        if clinic_id:
            stmt = stmt.where(ClinicBookingSettingsORM.clinic_id == clinic_id)
        stmt = stmt.order_by(ClinicBookingSettingsORM.created_at.asc()).limit(1)
        res = await self.session.execute(stmt)
        orm = res.scalar_one_or_none()

        if not orm:
            return BookingSettings(
                id=uuid4(),
                booking_mode="open",
                advance_booking_days=60,
                slot_interval_minutes=30,
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
            slot_interval_minutes=orm.slot_interval_minutes,
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
        orm.slot_interval_minutes = settings.slot_interval_minutes
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
            slot_interval_minutes=orm.slot_interval_minutes,
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
            orm.updated_at = datetime.now(timezone.utc)
            await self.session.flush()
            updated_list.append(
                WorkingHours(
                    id=orm.id,
                    day_of_week=orm.day_of_week,
                    open_time=orm.open_time,
                    close_time=orm.close_time,
                    is_closed=orm.is_closed,
                    clinic_id=orm.clinic_id,
                    created_at=orm.created_at,
                    updated_at=orm.updated_at,
                )
            )
        return updated_list

    async def list_closures(self, clinic_id: Optional[UUID] = None, future_only: bool = False) -> List[ClinicClosure]:
        stmt = select(ClinicClosureORM)
        if clinic_id:
            stmt = stmt.where(ClinicClosureORM.clinic_id == clinic_id)
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
