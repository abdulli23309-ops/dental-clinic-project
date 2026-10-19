from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.integration import IntegrationClient


class IntegrationClientRepository(ABC):
    @abstractmethod
    async def get_by_id(self, client_id: UUID) -> Optional[IntegrationClient]:
        pass

    @abstractmethod
    async def get_active_by_prefix(self, key_prefix: str) -> List[IntegrationClient]:
        pass

    @abstractmethod
    async def list_all(self) -> List[IntegrationClient]:
        pass

    @abstractmethod
    async def create(self, client: IntegrationClient) -> IntegrationClient:
        pass

    @abstractmethod
    async def update(self, client: IntegrationClient) -> IntegrationClient:
        pass

    @abstractmethod
    async def record_usage(self, client_id: UUID) -> None:
        pass
