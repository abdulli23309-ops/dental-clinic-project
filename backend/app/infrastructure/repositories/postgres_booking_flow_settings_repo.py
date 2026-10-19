from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_flow import BookingFlowSettings
from app.domain.repositories.booking_flow_settings_repo import BookingFlowSettingsRepository
from app.infrastructure.database.orm_models import BookingFlowSettingsORM, OrganizationORM


class PostgresBookingFlowSettingsRepository(BookingFlowSettingsRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: BookingFlowSettingsORM) -> BookingFlowSettings:
        return BookingFlowSettings(
            id=orm.id,
            organization_id=orm.organization_id,
            followup_gaps_minutes=orm.followup_gaps_minutes or [10, 1440, 2880],
            max_attempts=orm.max_attempts,
            cold_wait_hours=orm.cold_wait_hours,
            hold_minutes=orm.hold_minutes,
            fallback_owner_user_id=orm.fallback_owner_user_id,
            auto_confirm_online=orm.auto_confirm_online,
            days_shown=orm.days_shown,
            show_patients_treated=orm.show_patients_treated,
            lead_capture_notice=orm.lead_capture_notice,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def get_settings(self, organization_id: Optional[UUID] = None) -> BookingFlowSettings:
        if organization_id:
            stmt = select(BookingFlowSettingsORM).where(BookingFlowSettingsORM.organization_id == organization_id)
            res = await self._session.execute(stmt)
            orm = res.scalar_one_or_none()
            if orm:
                return self._to_domain(orm)

        # Fallback to first available organization settings
        stmt = select(BookingFlowSettingsORM).order_by(BookingFlowSettingsORM.created_at.asc()).limit(1)
        res = await self._session.execute(stmt)
        orm = res.scalar_one_or_none()
        if orm:
            return self._to_domain(orm)

        # If no organization or settings exist, find or create org and default settings
        org_res = await self._session.execute(select(OrganizationORM).limit(1))
        org = org_res.scalar_one_or_none()
        org_id = org.id if org else (organization_id or UUID("00000000-0000-0000-0000-000000000001"))

        new_orm = BookingFlowSettingsORM(
            organization_id=org_id,
            followup_gaps_minutes=[10, 1440, 2880],
            max_attempts=3,
            cold_wait_hours=24,
            hold_minutes=30,
            fallback_owner_user_id=None,
            auto_confirm_online=True,
            days_shown=7,
            show_patients_treated=True,
            lead_capture_notice="We save your details so we can help you finish booking.",
        )
        self._session.add(new_orm)
        await self._session.flush()
        await self._session.refresh(new_orm)
        return self._to_domain(new_orm)

    async def update_settings(self, settings: BookingFlowSettings) -> BookingFlowSettings:
        orm = await self._session.get(BookingFlowSettingsORM, settings.id)
        if not orm:
            stmt = select(BookingFlowSettingsORM).where(BookingFlowSettingsORM.organization_id == settings.organization_id)
            res = await self._session.execute(stmt)
            orm = res.scalar_one_or_none()

        if orm:
            orm.followup_gaps_minutes = settings.followup_gaps_minutes
            orm.max_attempts = settings.max_attempts
            orm.cold_wait_hours = settings.cold_wait_hours
            orm.hold_minutes = settings.hold_minutes
            orm.fallback_owner_user_id = settings.fallback_owner_user_id
            orm.auto_confirm_online = settings.auto_confirm_online
            orm.days_shown = settings.days_shown
            orm.show_patients_treated = settings.show_patients_treated
            orm.lead_capture_notice = settings.lead_capture_notice
            await self._session.flush()
            await self._session.refresh(orm)
            return self._to_domain(orm)
        else:
            new_orm = BookingFlowSettingsORM(
                id=settings.id,
                organization_id=settings.organization_id,
                followup_gaps_minutes=settings.followup_gaps_minutes,
                max_attempts=settings.max_attempts,
                cold_wait_hours=settings.cold_wait_hours,
                hold_minutes=settings.hold_minutes,
                fallback_owner_user_id=settings.fallback_owner_user_id,
                auto_confirm_online=settings.auto_confirm_online,
                days_shown=settings.days_shown,
                show_patients_treated=settings.show_patients_treated,
                lead_capture_notice=settings.lead_capture_notice,
            )
            self._session.add(new_orm)
            await self._session.flush()
            await self._session.refresh(new_orm)
            return self._to_domain(new_orm)
