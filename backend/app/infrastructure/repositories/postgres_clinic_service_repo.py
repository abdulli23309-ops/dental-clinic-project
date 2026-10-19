from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_flow import ClinicService
from app.domain.repositories.clinic_service_repo import ClinicServiceRepository
from app.infrastructure.database.orm_models import ClinicServiceORM


class PostgresClinicServiceRepository(ClinicServiceRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: ClinicServiceORM) -> ClinicService:
        return ClinicService(
            id=orm.id,
            clinic_id=orm.clinic_id,
            service_id=orm.service_id,
            is_active=orm.is_active,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def list_by_clinic(self, clinic_id: UUID) -> List[ClinicService]:
        stmt = select(ClinicServiceORM).where(
            ClinicServiceORM.clinic_id == clinic_id,
            ClinicServiceORM.is_active.is_(True),
        )
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()]

    async def list_by_service(self, service_id: UUID) -> List[ClinicService]:
        stmt = select(ClinicServiceORM).where(
            ClinicServiceORM.service_id == service_id,
            ClinicServiceORM.is_active.is_(True),
        )
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()]

    async def is_service_offered(self, clinic_id: UUID, service_id: UUID) -> bool:
        stmt = select(ClinicServiceORM).where(
            ClinicServiceORM.clinic_id == clinic_id,
            ClinicServiceORM.service_id == service_id,
            ClinicServiceORM.is_active.is_(True),
        )
        res = await self._session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def set_clinic_services(self, clinic_id: UUID, service_ids: List[UUID]) -> None:
        # Delete existing links for this clinic
        await self._session.execute(
            delete(ClinicServiceORM).where(ClinicServiceORM.clinic_id == clinic_id)
        )
        # Insert requested links
        for sid in service_ids:
            self._session.add(
                ClinicServiceORM(
                    clinic_id=clinic_id,
                    service_id=sid,
                    is_active=True,
                )
            )
        await self._session.flush()

    async def set_service_clinics(self, service_id: UUID, clinic_ids: List[UUID]) -> None:
        # Delete existing links for this service
        await self._session.execute(
            delete(ClinicServiceORM).where(ClinicServiceORM.service_id == service_id)
        )
        # Insert requested links
        for cid in clinic_ids:
            self._session.add(
                ClinicServiceORM(
                    clinic_id=cid,
                    service_id=service_id,
                    is_active=True,
                )
            )
        await self._session.flush()
