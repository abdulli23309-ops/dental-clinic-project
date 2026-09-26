import random
from datetime import date, datetime, timezone
from sqlalchemy.exc import IntegrityError

from app.application.dtos.appointment_dto import (
    AppointmentCreateRequest,
    AppointmentCreateResponse,
)
from app.core.logging import logger
from app.domain.models.appointment import Appointment
from app.domain.repositories.appointment_repo import AppointmentRepository


class AppointmentService:
    """
    Coordinates the business steps needed to book an appointment.

    This service creates unique confirmation codes, handles collisions if two patients
    generate the same code, and instructs the database repository to store the record.
    """

    def __init__(self, repository: AppointmentRepository) -> None:
        """Stores the given repository so this service can save and retrieve appointment records."""
        self._repository = repository

    @staticmethod
    def generate_confirmation_id() -> str:
        """Creates a readable tracking ID in the format MD-YYYY-XXXX (such as MD-2026-4821)."""
        year = datetime.now(timezone.utc).year
        suffix = random.randint(1000, 9999)
        return f"MD-{year}-{suffix}"

    async def create_appointment_request(
        self,
        request: AppointmentCreateRequest,
    ) -> AppointmentCreateResponse:
        """
        Takes patient booking details, assigns a tracking ID, and saves the appointment.

        If the randomly generated tracking code accidentally matches an existing record in the database,
        this method catches the conflict and automatically tries again with a fresh code.
        """
        parsed_date = date.fromisoformat(request.preferredDate)

        # Attempt creation with up to 1 retry on confirmation_id unique constraint collision
        max_attempts = 2
        for attempt in range(max_attempts):
            confirmation_id = self.generate_confirmation_id()
            appointment = Appointment(
                confirmation_id=confirmation_id,
                service_id=request.serviceId,
                preferred_date=parsed_date,
                preferred_time=request.preferredTime,
                patient_full_name=request.fullName,
                patient_phone=request.phone,
                patient_email=request.email,
                has_insurance=request.hasInsurance,
                insurance_provider=request.insuranceProvider,
                notes=request.notes,
                utm_source=request.utmSource,
                utm_campaign=request.utmCampaign,
            )

            try:
                saved = await self._repository.save(appointment)
                # PHI-Safe Logging: Never log patient name, phone, email, notes, or insurance details
                logger.info(
                    "Appointment request created: confirmation_id=%s, service=%s, date=%s",
                    saved.confirmation_id,
                    saved.service_id,
                    saved.preferred_date.isoformat(),
                )

                return AppointmentCreateResponse(
                    success=True,
                    confirmationId=saved.confirmation_id,
                    message=f"Appointment request received for {saved.preferred_date.isoformat()} at {saved.preferred_time}.",
                    estimatedCallbackWindow="Within 1 business hour (Monday to Thursday 8:00 AM to 6:00 PM Central)",
                )
            except IntegrityError:
                if attempt < max_attempts - 1:
                    logger.warning("Collision encountered on confirmation_id=%s, retrying...", confirmation_id)
                    continue
                logger.error("Failed to generate unique confirmation_id after %d attempts.", max_attempts)
                raise
