from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.integration import IntegrationClient
from app.domain.repositories.integration_client_repo import IntegrationClientRepository
from app.infrastructure.database.orm_models import IntegrationClientORM


class PostgresIntegrationClientRepository(IntegrationClientRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: IntegrationClientORM) -> IntegrationClient:
        return IntegrationClient(
            id=orm.id,
            name=orm.name,
            key_prefix=orm.key_prefix,
            key_hash=orm.key_hash,
            scopes=orm.scopes or [],
            is_active=orm.is_active,
            last_used_at=orm.last_used_at,
            ip_allowlist=orm.ip_allowlist,
            created_by_user_id=orm.created_by_user_id,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def get_by_id(self, client_id: UUID) -> Optional[IntegrationClient]:
        orm = await self._session.get(IntegrationClientORM, client_id)
        if not orm:
            return None
        return self._to_domain(orm)

    async def get_active_by_prefix(self, key_prefix: str) -> List[IntegrationClient]:
        stmt = (
            select(IntegrationClientORM)
            .where(
                IntegrationClientORM.key_prefix == key_prefix,
                IntegrationClientORM.is_active.is_(True),
            )
        )
        res = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in res.scalars().all()]

    async def list_all(self) -> List[IntegrationClient]:
        stmt = (
            select(IntegrationClientORM)
            .order_by(IntegrationClientORM.created_at.desc())
        )
        res = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in res.scalars().all()]

    async def create(self, client: IntegrationClient) -> IntegrationClient:
        orm = IntegrationClientORM(
            id=client.id,
            name=client.name,
            key_prefix=client.key_prefix,
            key_hash=client.key_hash,
            scopes=client.scopes,
            is_active=client.is_active,
            last_used_at=client.last_used_at,
            ip_allowlist=client.ip_allowlist,
            created_by_user_id=client.created_by_user_id,
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def update(self, client: IntegrationClient) -> IntegrationClient:
        orm = await self._session.get(IntegrationClientORM, client.id)
        if not orm:
            raise ValueError(f"Integration client {client.id} not found")
        orm.name = client.name
        orm.key_prefix = client.key_prefix
        orm.key_hash = client.key_hash
        orm.scopes = client.scopes
        orm.is_active = client.is_active
        orm.last_used_at = client.last_used_at
        orm.ip_allowlist = client.ip_allowlist
        await self._session.flush()
        return self._to_domain(orm)

    async def record_usage(self, client_id: UUID) -> None:
        stmt = (
            update(IntegrationClientORM)
            .where(IntegrationClientORM.id == client_id)
            .values(last_used_at=datetime.now(timezone.utc))
        )
        await self._session.execute(stmt)
        await self._session.flush()
