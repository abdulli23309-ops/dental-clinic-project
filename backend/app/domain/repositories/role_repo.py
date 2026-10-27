from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.roles_permissions import Role


class RoleRepository(ABC):
    """Abstract interface for role persistence operations."""

    @abstractmethod
    async def list_all(self, include_inactive: bool = False) -> List[Role]:
        pass

    @abstractmethod
    async def get_by_id(self, role_id: UUID) -> Optional[Role]:
        pass

    @abstractmethod
    async def get_by_name(self, name: str) -> Optional[Role]:
        pass

    @abstractmethod
    async def save(self, role: Role) -> Role:
        pass

    @abstractmethod
    async def delete(self, role_id: UUID, soft: bool = True) -> bool:
        pass
