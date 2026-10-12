from abc import ABC, abstractmethod
from datetime import date
from typing import List, Optional
from uuid import UUID

from app.domain.models.booking_settings import BookingSettings, ClinicClosure, WorkingHours


class BookingSettingsRepository(ABC):
    """
    Protocol for reading and mutating clinic working hours, closures, and booking settings.
    """

    @abstractmethod
    async def get_settings(self, clinic_id: Optional[UUID] = None) -> BookingSettings:
        pass

    @abstractmethod
    async def update_settings(self, settings: BookingSettings) -> BookingSettings:
        pass

    @abstractmethod
    async def list_working_hours(self, clinic_id: Optional[UUID] = None) -> List[WorkingHours]:
        pass

    @abstractmethod
    async def update_working_hours(self, hours: List[WorkingHours]) -> List[WorkingHours]:
        pass

    @abstractmethod
    async def list_closures(self, clinic_id: Optional[UUID] = None, future_only: bool = False) -> List[ClinicClosure]:
        pass

    @abstractmethod
    async def get_closure(self, closure_id: UUID) -> Optional[ClinicClosure]:
        pass

    @abstractmethod
    async def save_closure(self, closure: ClinicClosure) -> ClinicClosure:
        pass

    @abstractmethod
    async def delete_closure(self, closure_id: UUID) -> bool:
        pass
