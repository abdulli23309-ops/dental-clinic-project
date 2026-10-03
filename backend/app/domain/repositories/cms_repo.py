from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from uuid import UUID

from app.domain.models.cms import FaqItem, SiteSection


class CmsRepository(ABC):
    """Abstract interface defining persistence operations for FAQ items and CMS sections."""

    @abstractmethod
    async def list_faqs(self, include_inactive: bool = False) -> List[FaqItem]:
        pass

    @abstractmethod
    async def get_faq_by_id(self, faq_id: UUID) -> Optional[FaqItem]:
        pass

    @abstractmethod
    async def save_faq(self, faq: FaqItem) -> FaqItem:
        pass

    @abstractmethod
    async def reorder_faqs(self, ordered_ids: List[UUID]) -> None:
        pass

    @abstractmethod
    async def get_section(self, section_key: str) -> Optional[SiteSection]:
        pass

    @abstractmethod
    async def get_all_sections(self) -> Dict[str, SiteSection]:
        pass

    @abstractmethod
    async def save_section(self, section: SiteSection) -> SiteSection:
        pass
