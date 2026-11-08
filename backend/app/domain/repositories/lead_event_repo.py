from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.domain.models.booking_flow import LeadEvent


class LeadEventRepository(ABC):
    """Repository contract for lead audit events."""

    @abstractmethod
    async def record_event(
        self,
        lead_id: UUID,
        event_type: str,
        actor_type: str,
        payload: Optional[Dict[str, Any]] = None,
        actor_id: Optional[str] = None,
    ) -> LeadEvent:
        """Records an immutable lead event."""
        pass

    @abstractmethod
    async def list_by_lead(self, lead_id: UUID) -> List[LeadEvent]:
        """Lists all events recorded for a lead in chronological order."""
        pass
