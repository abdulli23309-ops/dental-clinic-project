import json
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.team_member import TeamMember
from app.domain.repositories.team_repo import TeamMemberRepository
from app.infrastructure.database.orm_models import TeamMemberORM


class PostgresTeamMemberRepository(TeamMemberRepository):
    """PostgreSQL implementation of the TeamMemberRepository abstraction."""

    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: TeamMemberORM) -> TeamMember:
        specialties = []
        if orm.specialties_json:
            try:
                specialties = json.loads(orm.specialties_json)
            except Exception:
                specialties = []

        return TeamMember(
            id=orm.id,
            organization_id=orm.organization_id,
            location_id=orm.location_id,
            first_name=orm.first_name,
            last_name=orm.last_name,
            display_name=orm.display_name,
            professional_title=orm.professional_title,
            role=orm.role,
            specialties=specialties,
            biography=orm.biography,
            photo_url=orm.photo_url,
            education=orm.education,
            credentials=orm.credentials,
            license_number=orm.license_number,
            license_state=orm.license_state,
            services_offered=orm.services_offered,
            display_order=orm.display_order,
            is_active=orm.is_active,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    @staticmethod
    def _to_orm(domain: TeamMember) -> TeamMemberORM:
        return TeamMemberORM(
            id=domain.id,
            organization_id=domain.organization_id,
            location_id=domain.location_id,
            first_name=domain.first_name,
            last_name=domain.last_name,
            display_name=domain.display_name,
            professional_title=domain.professional_title,
            role=domain.role,
            specialties_json=json.dumps(domain.specialties) if domain.specialties else None,
            biography=domain.biography,
            photo_url=domain.photo_url,
            education=domain.education,
            credentials=domain.credentials,
            license_number=domain.license_number,
            license_state=domain.license_state,
            services_offered=domain.services_offered,
            display_order=domain.display_order,
            is_active=domain.is_active,
            created_at=domain.created_at,
            updated_at=domain.updated_at,
        )

    async def list_all(self, include_inactive: bool = False) -> List[TeamMember]:
        stmt = select(TeamMemberORM)
        if not include_inactive:
            stmt = stmt.where(TeamMemberORM.is_active.is_(True))
        stmt = stmt.order_by(TeamMemberORM.display_order.asc(), TeamMemberORM.created_at.asc())
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def get_by_id(self, member_id: UUID) -> Optional[TeamMember]:
        orm = await self._session.get(TeamMemberORM, member_id)
        return self._to_domain(orm) if orm else None

    async def save(self, member: TeamMember) -> TeamMember:
        existing = await self._session.get(TeamMemberORM, member.id)
        if existing:
            existing.organization_id = member.organization_id
            existing.location_id = member.location_id
            existing.first_name = member.first_name
            existing.last_name = member.last_name
            existing.display_name = member.display_name
            existing.professional_title = member.professional_title
            existing.role = member.role
            existing.specialties_json = json.dumps(member.specialties) if member.specialties else None
            existing.biography = member.biography
            existing.photo_url = member.photo_url
            existing.education = member.education
            existing.credentials = member.credentials
            existing.license_number = member.license_number
            existing.license_state = member.license_state
            existing.services_offered = member.services_offered
            existing.display_order = member.display_order
            existing.is_active = member.is_active
            existing.updated_at = member.updated_at
            await self._session.flush()
            return self._to_domain(existing)
        else:
            orm = self._to_orm(member)
            self._session.add(orm)
            await self._session.flush()
            return self._to_domain(orm)

    async def reorder(self, ordered_ids: List[UUID]) -> None:
        for order, member_id in enumerate(ordered_ids):
            member = await self._session.get(TeamMemberORM, member_id)
            if member:
                member.display_order = order
        await self._session.flush()
