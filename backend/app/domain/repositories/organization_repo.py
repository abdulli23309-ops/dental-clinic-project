from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.organization import Location, Organization


class OrganizationRepository(ABC):
    """Abstract interface defining persistence operations for Organization entities."""

    @abstractmethod
    async def get_current(self) -> Optional[Organization]:
        pass

    @abstractmethod
    async def get_by_id(self, org_id: UUID) -> Optional[Organization]:
        pass

    @abstractmethod
    async def save(self, org: Organization) -> Organization:
        pass


class LocationRepository(ABC):
    """Abstract interface defining persistence operations for Location entities."""

    @abstractmethod
    async def list_all(self, include_inactive: bool = False) -> List[Location]:
        pass

    @abstractmethod
    async def get_by_id(self, location_id: UUID) -> Optional[Location]:
        pass

    @abstractmethod
    async def save(self, location: Location) -> Location:
        pass
