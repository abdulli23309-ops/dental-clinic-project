from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_flow import LeadEvent
from app.domain.repositories.lead_event_repo import LeadEventRepository
from app.infrastructure.database.orm_models import LeadEventORM


class PostgresLeadEventRepository(LeadEventRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: LeadEventORM) -> LeadEvent:
        return LeadEvent(
            id=orm.id,
            lead_id=orm.lead_id,
            event_type=orm.event_type,
            payload=orm.payload or {},
            actor_type=orm.actor_type,
            actor_id=orm.actor_id,
            created_at=orm.created_at,
        )

    async def record_event(
        self,
        lead_id: UUID,
        event_type: str,
        actor_type: str,
        payload: Optional[Dict[str, Any]] = None,
        actor_id: Optional[str] = None,
    ) -> LeadEvent:
        orm = LeadEventORM(
            lead_id=lead_id,
            event_type=event_type,
            payload=payload or {},
            actor_type=actor_type,
            actor_id=actor_id,
        )
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return self._to_domain(orm)

    async def list_by_lead(self, lead_id: UUID) -> List[LeadEvent]:
        stmt = (
            select(LeadEventORM)
            .where(LeadEventORM.lead_id == lead_id)
            .order_by(LeadEventORM.created_at.asc())
        )
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()]
