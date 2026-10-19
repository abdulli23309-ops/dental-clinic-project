from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from app.domain.models.booking_flow import BookingFlowSettings


class BookingFlowSettingsRepository(ABC):
    """Repository contract for organization booking flow settings."""

    @abstractmethod
    async def get_settings(self, organization_id: Optional[UUID] = None) -> BookingFlowSettings:
        """Retrieves booking flow settings for an organization (or platform default)."""
        pass

    @abstractmethod
    async def update_settings(self, settings: BookingFlowSettings) -> BookingFlowSettings:
        """Updates booking flow settings."""
        pass
