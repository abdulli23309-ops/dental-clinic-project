from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.booking_flow import ClinicService


class ClinicServiceRepository(ABC):
    """Repository contract for clinic catalog service links."""

    @abstractmethod
    async def list_by_clinic(self, clinic_id: UUID) -> List[ClinicService]:
        """Lists all active services linked to a clinic."""
        pass

    @abstractmethod
    async def list_by_service(self, service_id: UUID) -> List[ClinicService]:
        """Lists all clinics offering a service."""
        pass

    @abstractmethod
    async def is_service_offered(self, clinic_id: UUID, service_id: UUID) -> bool:
        """Checks if a clinic offers a specific catalog service."""
        pass

    @abstractmethod
    async def set_clinic_services(self, clinic_id: UUID, service_ids: List[UUID]) -> None:
        """Configures all services offered by a clinic."""
        pass

    @abstractmethod
    async def set_service_clinics(self, service_id: UUID, clinic_ids: List[UUID]) -> None:
        """Configures all clinics offering a service."""
        pass
