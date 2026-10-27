from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_flow import CallLog
from app.domain.models.phone_utils import normalize_pakistan_phone
from app.domain.repositories.call_log_repo import CallLogRepository
from app.infrastructure.database.orm_models import CallLogORM


class PostgresCallLogRepository(CallLogRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: CallLogORM) -> CallLog:
        return CallLog(
            id=orm.id,
            phone_normalized=orm.phone_normalized,
            lead_id=orm.lead_id,
            patient_id=orm.patient_id,
            booking_id=orm.booking_id,
            outcome=orm.outcome,
            notes=orm.notes,
            started_at=orm.started_at,
            ended_at=orm.ended_at,
            recorded_by_user_id=orm.recorded_by_user_id,
            created_at=orm.created_at,
        )

    async def create_log(self, call_log: CallLog) -> CallLog:
        phone_norm = normalize_pakistan_phone(call_log.phone_normalized)
        orm = CallLogORM(
            id=call_log.id,
            phone_normalized=phone_norm,
            lead_id=call_log.lead_id,
            patient_id=call_log.patient_id,
            booking_id=call_log.booking_id,
            outcome=call_log.outcome,
            notes=call_log.notes,
            started_at=call_log.started_at,
            ended_at=call_log.ended_at,
            recorded_by_user_id=call_log.recorded_by_user_id,
            created_at=call_log.created_at,
        )
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return self._to_domain(orm)

    async def get_by_id(self, log_id: UUID) -> Optional[CallLog]:
        orm = await self._session.get(CallLogORM, log_id)
        return self._to_domain(orm) if orm else None

    async def list_by_phone(self, phone_normalized: str) -> List[CallLog]:
        phone_norm = normalize_pakistan_phone(phone_normalized)
        stmt = (
            select(CallLogORM)
            .where(CallLogORM.phone_normalized == phone_norm)
            .order_by(CallLogORM.started_at.desc())
        )
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()]

    async def list_recent(self, limit: int = 50) -> List[CallLog]:
        stmt = select(CallLogORM).order_by(CallLogORM.started_at.desc()).limit(limit)
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()]
