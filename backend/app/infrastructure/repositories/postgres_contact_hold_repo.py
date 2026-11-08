from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_flow import ContactHold
from app.domain.models.phone_utils import normalize_pakistan_phone
from app.domain.repositories.contact_hold_repo import ContactHoldRepository
from app.infrastructure.database.orm_models import ContactHoldORM


class PostgresContactHoldRepository(ContactHoldRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: ContactHoldORM) -> ContactHold:
        return ContactHold(
            id=orm.id,
            phone_normalized=orm.phone_normalized,
            held_until=orm.held_until,
            reason=orm.reason,
            created_by_user_id=orm.created_by_user_id,
            released_at=orm.released_at,
            created_at=orm.created_at,
        )

    async def create_hold(
        self,
        phone_normalized: str,
        hold_minutes: int = 30,
        reason: Optional[str] = None,
        created_by_user_id: Optional[UUID] = None,
    ) -> ContactHold:
        phone_norm = normalize_pakistan_phone(phone_normalized)
        now = datetime.now(timezone.utc)
        held_until = now + timedelta(minutes=hold_minutes)

        orm = ContactHoldORM(
            phone_normalized=phone_norm,
            held_until=held_until,
            reason=reason,
            created_by_user_id=created_by_user_id,
            released_at=None,
            created_at=now,
        )
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return self._to_domain(orm)

    async def get_active_hold(self, phone_normalized: str) -> Optional[ContactHold]:
        phone_norm = normalize_pakistan_phone(phone_normalized)
        now = datetime.now(timezone.utc)
        stmt = (
            select(ContactHoldORM)
            .where(
                ContactHoldORM.phone_normalized == phone_norm,
                ContactHoldORM.released_at.is_(None),
                ContactHoldORM.held_until > now,
            )
            .order_by(ContactHoldORM.held_until.desc())
            .limit(1)
        )
        res = await self._session.execute(stmt)
        orm = res.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def is_held(self, phone_normalized: str) -> bool:
        hold = await self.get_active_hold(phone_normalized)
        return hold is not None

    async def release_hold(self, phone_normalized: str) -> int:
        phone_norm = normalize_pakistan_phone(phone_normalized)
        now = datetime.now(timezone.utc)
        stmt = (
            update(ContactHoldORM)
            .where(
                ContactHoldORM.phone_normalized == phone_norm,
                ContactHoldORM.released_at.is_(None),
                ContactHoldORM.held_until > now,
            )
            .values(released_at=now)
        )
        res = await self._session.execute(stmt)
        await self._session.flush()
        return res.rowcount or 0

    async def list_active_holds(self) -> List[ContactHold]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(ContactHoldORM)
            .where(
                ContactHoldORM.released_at.is_(None),
                ContactHoldORM.held_until > now,
            )
            .order_by(ContactHoldORM.held_until.desc())
        )
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()]


async def is_held(phone: str, session: Optional[AsyncSession] = None) -> bool:
    """Convenience function checking if an active hold exists on the phone number."""
    from app.application.services.call_desk_service import is_held as _is_held
    return await _is_held(phone, session=session)
