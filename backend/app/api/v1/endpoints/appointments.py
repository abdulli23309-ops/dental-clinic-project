from fastapi import APIRouter, Depends, Request, status

from app.api.deps import get_appointment_service
from app.application.dtos.appointment_dto import (
    AppointmentCreateRequest,
    AppointmentCreateResponse,
)
from app.application.services.appointment_service import AppointmentService
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()


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
