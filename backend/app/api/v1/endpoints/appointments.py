from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_appointment_service, require_admin, get_db_session
from app.application.dtos.appointment_dto import (
    AppointmentCreateRequest,
    AppointmentCreateResponse,
)
from app.application.services.appointment_service import AppointmentService
from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository
from app.infrastructure.database.orm_models import ClinicalEncounterORM, BookingORM
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()


@router.delete(
    "/appointments/{appointment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently scrub an appointment booking (Admin only)",
    dependencies=[Depends(require_admin)],
)
async def delete_appointment(
    appointment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Permanently deletes a booking if no signed clinical encounters are attached."""
    # Check if encounter attached
    stmt = select(func.count()).select_from(ClinicalEncounterORM).where(ClinicalEncounterORM.booking_id == appointment_id)
    count = (await db.execute(stmt)).scalar() or 0
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete an appointment with attached patient clinical encounters. Please Cancel it instead.",
        )

    booking_repo = PostgresBookingRepository(db)
    deleted = await booking_repo.delete(appointment_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found.",
        )
    return None


@router.post(
    "/appointments",
    response_model=AppointmentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit an appointment booking request",
)
@limiter.limit(settings.APPOINTMENTS_RATE_LIMIT)
async def create_appointment(
    request: Request,
    payload: AppointmentCreateRequest,
    service: AppointmentService = Depends(get_appointment_service),
) -> AppointmentCreateResponse:
    """
    Receives and processes a new patient appointment booking request.

    It validates the submitted form data, assigns a unique tracking number, and saves
    the request to the database so clinic staff can follow up by phone.
    """
    return await service.create_appointment_request(payload)
