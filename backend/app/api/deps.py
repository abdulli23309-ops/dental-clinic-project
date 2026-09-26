from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.appointment_service import AppointmentService
from app.core.database import get_db_session
from app.domain.repositories.appointment_repo import AppointmentRepository
from app.infrastructure.repositories.postgres_appointment_repo import (
    PostgresAppointmentRepository,
)


def get_appointment_repository(
    session: AsyncSession = Depends(get_db_session),
) -> AppointmentRepository:
    """
    Creates and provides a database repository helper for handling appointments.

    It receives an active database session and hands back a repository object configured
    to run queries and store records in PostgreSQL.
    """
    return PostgresAppointmentRepository(session)


def get_appointment_service(
    repository: AppointmentRepository = Depends(get_appointment_repository),
) -> AppointmentService:
    """
    Creates and provides the main appointment business service.

    It wires up the repository with the service so incoming web requests can create
    and validate appointment bookings without directly touching database tables.
    """
    return AppointmentService(repository)
