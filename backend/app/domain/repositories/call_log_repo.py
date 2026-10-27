from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.booking_flow import CallLog


class CallLogRepository(ABC):
    """Repository contract for call desk logs."""

    @abstractmethod
    async def create_log(self, call_log: CallLog) -> CallLog:
        """Saves a call log record."""
        pass

    @abstractmethod
    async def get_by_id(self, log_id: UUID) -> Optional[CallLog]:
        """Retrieves a call log by ID."""
        pass

    @abstractmethod
    async def list_by_phone(self, phone_normalized: str) -> List[CallLog]:
        """Lists all call logs for a specific phone number."""
        pass

    @abstractmethod
    async def list_recent(self, limit: int = 50) -> List[CallLog]:
        """Lists recent call logs."""
        pass
