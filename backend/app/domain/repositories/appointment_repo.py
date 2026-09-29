from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from app.domain.models.appointment import Appointment


class AppointmentRepository(ABC):
    """
    Defines the contract for saving and looking up appointments in storage.

    By using an abstract blueprint, the rest of the application can work with appointments
    without needing to know whether they are stored in PostgreSQL, SQLite, or another system.
    """

    @abstractmethod
    async def save(self, appointment: Appointment) -> Appointment:
        """Saves a new appointment or updates an existing one in permanent storage."""
        pass

    @abstractmethod
    async def get_by_confirmation_id(self, confirmation_id: str) -> Optional[Appointment]:
        """Finds and returns an appointment using its public tracking code (such as MD-2026-4821)."""
        pass

    @abstractmethod
    async def get_by_id(self, appointment_id: UUID) -> Optional[Appointment]:
        """Finds and returns an appointment using its internal unique ID."""
        pass
