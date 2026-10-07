from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.announcement import Announcement


class AnnouncementRepository(ABC):
    """Abstract interface for Announcement persistence."""

    @abstractmethod
    async def list_all(self, include_inactive: bool = False) -> List[Announcement]:
        """List announcements ordered by display_order, created_at."""
        pass

    @abstractmethod
    async def get_by_id(self, announcement_id: UUID) -> Optional[Announcement]:
        """Retrieve an announcement by its UUID."""
        pass

    @abstractmethod
    async def save(self, announcement: Announcement) -> Announcement:
        """Create or update an announcement."""
        pass

    @abstractmethod
    async def delete(self, announcement_id: UUID) -> bool:
        """Delete an announcement by UUID."""
        pass
