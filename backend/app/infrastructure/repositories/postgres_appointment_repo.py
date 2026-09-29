from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.appointment import Appointment, AppointmentStatus
from app.domain.repositories.appointment_repo import AppointmentRepository
from app.infrastructure.database.orm_models import AppointmentORM


class PostgresAppointmentRepository(AppointmentRepository):
    """
    Handles saving and retrieving appointment records in a PostgreSQL database.

    It translates between pure business models used by the application and the database
    rows managed by SQLAlchemy.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Stores the active database session used to run SQL queries."""
        self._session = session

    @staticmethod
    def _to_orm(entity: Appointment) -> AppointmentORM:
        """Converts a business appointment object into a database row model ready for saving."""
        return AppointmentORM(
            id=entity.id,
            confirmation_id=entity.confirmation_id,
            status=entity.status.value,
            service_id=entity.service_id,
            preferred_date=entity.preferred_date,
            preferred_time=entity.preferred_time,
            patient_full_name=entity.patient_full_name,
            patient_phone=entity.patient_phone,
            patient_email=entity.patient_email,
            has_insurance=entity.has_insurance,
            insurance_provider=entity.insurance_provider,
            notes=entity.notes,
            utm_source=entity.utm_source,
            utm_campaign=entity.utm_campaign,
            staff_notes=entity.staff_notes,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    @staticmethod
    def _to_domain(orm: AppointmentORM) -> Appointment:
        """Converts a database row model back into a pure business appointment object."""
        return Appointment(
            id=orm.id,
            confirmation_id=orm.confirmation_id,
            status=AppointmentStatus(orm.status),
            service_id=orm.service_id,
            preferred_date=orm.preferred_date,
            preferred_time=orm.preferred_time,
            patient_full_name=orm.patient_full_name,
            patient_phone=orm.patient_phone,
            patient_email=orm.patient_email,
            has_insurance=orm.has_insurance,
            insurance_provider=orm.insurance_provider,
            notes=orm.notes,
            utm_source=orm.utm_source,
            utm_campaign=orm.utm_campaign,
            staff_notes=orm.staff_notes,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def save(self, appointment: Appointment) -> Appointment:
        """Saves or updates an appointment in the database and flushes changes immediately."""
        orm_obj = self._to_orm(appointment)
        merged = await self._session.merge(orm_obj)
        await self._session.flush()
        return self._to_domain(merged)

    async def get_by_confirmation_id(self, confirmation_id: str) -> Optional[Appointment]:
        """Looks up an appointment row in PostgreSQL by its unique confirmation code."""
        stmt = select(AppointmentORM).where(AppointmentORM.confirmation_id == confirmation_id)
        result = await self._session.execute(stmt)
        orm_obj = result.scalars().first()
        return self._to_domain(orm_obj) if orm_obj else None

    async def get_by_id(self, appointment_id: UUID) -> Optional[Appointment]:
        """Looks up an appointment row in PostgreSQL by its primary key UUID."""
        stmt = select(AppointmentORM).where(AppointmentORM.id == appointment_id)
        result = await self._session.execute(stmt)
        orm_obj = result.scalars().first()
        return self._to_domain(orm_obj) if orm_obj else None
