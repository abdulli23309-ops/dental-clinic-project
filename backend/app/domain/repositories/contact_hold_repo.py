from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from app.domain.models.booking_flow import ContactHold


class ContactHoldRepository(ABC):
    """Repository contract for contact holds blocking automated recovery messages."""

    @abstractmethod
    async def create_hold(
        self,
        phone_normalized: str,
        hold_minutes: int = 30,
        reason: Optional[str] = None,
        created_by_user_id: Optional[UUID] = None,
    ) -> ContactHold:
        """Places a hold on the normalized phone number."""
        pass

    @abstractmethod
    async def get_active_hold(self, phone_normalized: str) -> Optional[ContactHold]:
        """Gets the active hold on a number if one exists."""
        pass

    @abstractmethod
    async def is_held(self, phone_normalized: str) -> bool:
        """Returns True if the contact number currently has an active hold."""
        pass

    @abstractmethod
    async def release_hold(self, phone_normalized: str) -> int:
        """Releases any active holds for the normalized phone number."""
        pass

    @abstractmethod
    async def list_active_holds(self) -> List[ContactHold]:
        """Returns all currently active contact holds."""
        pass
