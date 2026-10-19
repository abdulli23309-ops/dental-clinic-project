from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from uuid import UUID

from app.domain.models.booking_crm import Lead, LeadSource


class LeadRepository(ABC):
    """
    Contract for managing prospect leads and acquisition sources.
    """

    @abstractmethod
    async def save(self, lead: Lead) -> Lead:
        """Saves or updates a lead."""
        pass

    @abstractmethod
    async def get_by_id(self, lead_id: UUID) -> Optional[Lead]:
        """Retrieves a lead by ID."""
        pass

    @abstractmethod
    async def get_by_capture_token(self, token: str) -> Optional[Lead]:
        """Retrieves a lead by its secure capture token."""
        pass

    @abstractmethod
    async def issue_capture_token(self, lead_id: UUID, expires_in_hours: int = 24) -> str:
        """Issues and stores a fresh hashed capture token for a lead, returning the plain token."""
        pass

    @abstractmethod
    async def acquire_phone_lock(self, phone_normalized: str) -> None:
        """Acquires a database transaction lock for the normalized phone number if supported."""
        pass

    @abstractmethod
    async def list_by_phone(self, phone: str) -> List[Lead]:
        """Retrieves leads matching a raw or normalized phone number."""
        pass

    @abstractmethod
    async def list_leads(
        self,
        clinic_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Lead], int]:
        """Returns filtered leads list with pagination."""
        pass

    @abstractmethod
    async def list_sources(self) -> List[LeadSource]:
        """Returns all active lead acquisition channels."""
        pass

    @abstractmethod
    async def save_source(self, source: LeadSource) -> LeadSource:
        """Saves a lead source."""
        pass
