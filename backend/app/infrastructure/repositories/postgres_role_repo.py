from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.roles_permissions import Role
from app.domain.repositories.role_repo import RoleRepository
from app.infrastructure.database.orm_models import RoleORM


class PostgresRoleRepository(RoleRepository):
    """PostgreSQL implementation of the RoleRepository abstraction."""

    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: RoleORM) -> Role:
        return Role(
            id=orm.id,
            name=orm.name,
            display_name=orm.display_name or orm.name,
            description=orm.description,
            is_active=orm.is_active,
            display_order=orm.display_order or 0,
            is_system=orm.is_system,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    @staticmethod
    def _to_orm(domain: Role) -> RoleORM:
        return RoleORM(
            id=domain.id,
            name=domain.name,
            display_name=domain.display_name or domain.name,
            description=domain.description,
            is_active=domain.is_active,
            display_order=domain.display_order,
            is_system=domain.is_system,
            created_at=domain.created_at,
            updated_at=domain.updated_at,
        )

    async def list_all(self, include_inactive: bool = False) -> List[Role]:
        stmt = select(RoleORM)
        if not include_inactive:
            stmt = stmt.where(RoleORM.is_active.is_(True))
        stmt = stmt.order_by(RoleORM.display_order.asc(), RoleORM.name.asc())
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def get_by_id(self, role_id: UUID) -> Optional[Role]:
        orm = await self._session.get(RoleORM, role_id)
        return self._to_domain(orm) if orm else None

    async def get_by_name(self, name: str) -> Optional[Role]:
        stmt = select(RoleORM).where(func.lower(RoleORM.name) == name.strip().lower())
        result = await self._session.execute(stmt)
        orm = result.scalars().first()
        return self._to_domain(orm) if orm else None

    async def save(self, role: Role) -> Role:
        existing = await self._session.get(RoleORM, role.id)
        now = datetime.now(timezone.utc)
        if existing:
            existing.name = role.name
            existing.display_name = role.display_name or role.name
            existing.description = role.description
            existing.is_active = role.is_active
            existing.display_order = role.display_order
            existing.is_system = role.is_system
            existing.updated_at = now
            await self._session.flush()
            return self._to_domain(existing)
        else:
            orm = self._to_orm(role)
            orm.created_at = now
            orm.updated_at = now
            self._session.add(orm)
            await self._session.flush()
            return self._to_domain(orm)

    async def delete(self, role_id: UUID, soft: bool = True) -> bool:
        orm = await self._session.get(RoleORM, role_id)
        if not orm:
            return False
        if soft:
            orm.is_active = False
            orm.updated_at = datetime.now(timezone.utc)
            await self._session.flush()
        else:
            await self._session.delete(orm)
            await self._session.flush()
        return True
