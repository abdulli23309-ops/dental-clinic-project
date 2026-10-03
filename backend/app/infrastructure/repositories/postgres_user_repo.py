import json
from typing import Optional
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.user import RefreshToken, User, UserRole
from app.domain.repositories.user_repo import RefreshTokenRepository, UserRepository
from app.infrastructure.database.orm_models import RefreshTokenORM, UserORM


class PostgresUserRepository(UserRepository):
    """PostgreSQL implementation of the UserRepository abstraction."""

    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: UserORM) -> User:
        return User(
            id=orm.id,
            email=orm.email,
            hashed_password=orm.hashed_password,
            full_name=orm.full_name,
            role=UserRole(orm.role),
            is_active=orm.is_active,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    @staticmethod
    def _to_orm(domain: User) -> UserORM:
        return UserORM(
            id=domain.id,
            email=domain.email,
            hashed_password=domain.hashed_password,
            full_name=domain.full_name,
            role=domain.role.value,
            is_active=domain.is_active,
            created_at=domain.created_at,
            updated_at=domain.updated_at,
        )

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        stmt = select(UserORM).where(UserORM.id == user_id)
        result = await self._session.execute(stmt)
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(UserORM).where(UserORM.email == email.strip().lower())
        result = await self._session.execute(stmt)
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def save(self, user: User) -> User:
        existing = await self._session.get(UserORM, user.id)
        if existing:
            existing.email = user.email.strip().lower()
            existing.hashed_password = user.hashed_password
            existing.full_name = user.full_name
            existing.role = user.role.value
            existing.is_active = user.is_active
            existing.updated_at = user.updated_at
            await self._session.flush()
            return self._to_domain(existing)
        else:
            orm = self._to_orm(user)
            self._session.add(orm)
            await self._session.flush()
            return self._to_domain(orm)


class PostgresRefreshTokenRepository(RefreshTokenRepository):
    """PostgreSQL implementation of the RefreshTokenRepository abstraction."""

    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: RefreshTokenORM) -> RefreshToken:
        return RefreshToken(
            id=orm.id,
            user_id=orm.user_id,
            token_hash=orm.token_hash,
            expires_at=orm.expires_at,
            is_revoked=orm.is_revoked,
            replaced_by=orm.replaced_by,
            created_at=orm.created_at,
        )

    async def save(self, token: RefreshToken) -> RefreshToken:
        orm = RefreshTokenORM(
            id=token.id,
            user_id=token.user_id,
            token_hash=token.token_hash,
            expires_at=token.expires_at,
            is_revoked=token.is_revoked,
            replaced_by=token.replaced_by,
            created_at=token.created_at,
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def get_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        stmt = select(RefreshTokenORM).where(RefreshTokenORM.token_hash == token_hash)
        result = await self._session.execute(stmt)
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def revoke(self, token_id: UUID, replaced_by: Optional[UUID] = None) -> None:
        stmt = (
            update(RefreshTokenORM)
            .where(RefreshTokenORM.id == token_id)
            .values(is_revoked=True, replaced_by=replaced_by)
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def revoke_all_for_user(self, user_id: UUID) -> None:
        stmt = (
            update(RefreshTokenORM)
            .where(RefreshTokenORM.user_id == user_id)
            .values(is_revoked=True)
        )
        await self._session.execute(stmt)
        await self._session.flush()
