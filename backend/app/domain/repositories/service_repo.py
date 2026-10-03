from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.service import Service


class ServiceRepository(ABC):
    """Abstract interface defining persistence operations for Service entities."""

    @abstractmethod
    async def list_all(self, include_inactive: bool = False, public_only: bool = False) -> List[Service]:
        pass

    @abstractmethod
    async def get_by_id(self, service_id: UUID) -> Optional[Service]:
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Optional[Service]:
        pass

    @abstractmethod
    async def save(self, service: Service) -> Service:
        pass

    @abstractmethod
    async def reorder(self, ordered_ids: List[UUID]) -> None:
        pass
