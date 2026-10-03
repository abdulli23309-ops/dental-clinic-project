from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.team_member import TeamMember


class TeamMemberRepository(ABC):
    """Abstract interface defining persistence operations for TeamMember entities."""

    @abstractmethod
    async def list_all(self, include_inactive: bool = False) -> List[TeamMember]:
        pass

    @abstractmethod
    async def get_by_id(self, member_id: UUID) -> Optional[TeamMember]:
        pass

    @abstractmethod
    async def save(self, member: TeamMember) -> TeamMember:
        pass

    @abstractmethod
    async def reorder(self, ordered_ids: List[UUID]) -> None:
        pass
