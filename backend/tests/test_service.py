import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock
from sqlalchemy.exc import IntegrityError

from app.application.dtos.appointment_dto import (
    AppointmentCreateRequest,
    AppointmentCreateResponse,
)
from app.application.services.appointment_service import AppointmentService
from app.domain.models.appointment import Appointment
from app.domain.repositories.appointment_repo import AppointmentRepository


@pytest.mark.asyncio
async def test_appointment_service_successful_creation():
    mock_repo = AsyncMock(spec=AppointmentRepository)
    # mock save returns the passed appointment
    mock_repo.save.side_effect = lambda apt: apt

    service = AppointmentService(mock_repo)

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    request = AppointmentCreateRequest(
        serviceId="cleanings-exams",
        preferredDate=tomorrow,
        preferredTime="10:00 AM",
        fullName="Jane Alvarez",
        phone="(312) 555-0100",
        email="jane@example.com",
        hasInsurance=True,
        insuranceProvider="Delta Dental PPO",
        notes="Sensitive lower molar",
        utmSource="google",
        utmCampaign="lincoln-park",
    )

    response = await service.create_appointment_request(request)

    assert response.success is True
    assert response.confirmationId.startswith("MD-")
    assert "Within 1 business hour" in response.estimatedCallbackWindow

    # Verify repository was called
    mock_repo.save.assert_called_once()
    saved_entity: Appointment = mock_repo.save.call_args[0][0]
    assert saved_entity.patient_full_name == "Jane Alvarez"
    assert saved_entity.patient_phone == "(312) 555-0100"
    assert saved_entity.has_insurance is True
    assert saved_entity.insurance_provider == "Delta Dental PPO"


@pytest.mark.asyncio
async def test_appointment_service_collision_retry():
    mock_repo = AsyncMock(spec=AppointmentRepository)

    # First call raises IntegrityError, subsequent call returns appointment
    def save_side_effect(apt):
        if mock_repo.save.call_count == 1:
            raise IntegrityError("duplicate key", params=None, orig=Exception("unique violation"))
        return apt

    mock_repo.save.side_effect = save_side_effect

    service = AppointmentService(mock_repo)

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    request = AppointmentCreateRequest(
        serviceId="fillings-crowns",
        preferredDate=tomorrow,
        preferredTime="11:30 AM",
        fullName="Bob Smith",
        phone="3125550200",
        email="bob@example.com",
    )

    response = await service.create_appointment_request(request)
    assert response.success is True
    assert mock_repo.save.call_count == 2
