import json
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.cms import FaqItem, SiteSection
from app.domain.repositories.cms_repo import CmsRepository
from app.infrastructure.database.orm_models import FaqItemORM, SiteSectionORM


class PostgresCmsRepository(CmsRepository):
    """PostgreSQL implementation of the CmsRepository abstraction."""

    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_faq_domain(orm: FaqItemORM) -> FaqItem:
        return FaqItem(
            id=orm.id,
            category=orm.category,
            question=orm.question,
            answer=orm.answer,
            display_order=orm.display_order,
            is_active=orm.is_active,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    @staticmethod
    def _to_faq_orm(domain: FaqItem) -> FaqItemORM:
        return FaqItemORM(
            id=domain.id,
            category=domain.category,
            question=domain.question,
            answer=domain.answer,
            display_order=domain.display_order,
            is_active=domain.is_active,
            created_at=domain.created_at,
            updated_at=domain.updated_at,
        )

    async def list_faqs(self, include_inactive: bool = False) -> List[FaqItem]:
        stmt = select(FaqItemORM)
        if not include_inactive:
            stmt = stmt.where(FaqItemORM.is_active.is_(True))
        stmt = stmt.order_by(FaqItemORM.display_order.asc(), FaqItemORM.created_at.asc())
        result = await self._session.execute(stmt)
        return [self._to_faq_domain(orm) for orm in result.scalars().all()]

    async def get_faq_by_id(self, faq_id: UUID) -> Optional[FaqItem]:
        orm = await self._session.get(FaqItemORM, faq_id)
        return self._to_faq_domain(orm) if orm else None

    async def save_faq(self, faq: FaqItem) -> FaqItem:
        existing = await self._session.get(FaqItemORM, faq.id)
        if existing:
            existing.category = faq.category
            existing.question = faq.question
            existing.answer = faq.answer
            existing.display_order = faq.display_order
            existing.is_active = faq.is_active
            existing.updated_at = faq.updated_at
            await self._session.flush()
            return self._to_faq_domain(existing)
        else:
            orm = self._to_faq_orm(faq)
            self._session.add(orm)
            await self._session.flush()
            return self._to_faq_domain(orm)

    async def reorder_faqs(self, ordered_ids: List[UUID]) -> None:
        for order, faq_id in enumerate(ordered_ids):
            item = await self._session.get(FaqItemORM, faq_id)
            if item:
                item.display_order = order
        await self._session.flush()

    async def get_section(self, section_key: str) -> Optional[SiteSection]:
        orm = await self._session.get(SiteSectionORM, section_key)
        if not orm:
            return None
        try:
            content = json.loads(orm.content_json)
        except Exception:
            content = {}
        return SiteSection(
            section_key=orm.section_key,
            content=content,
            updated_at=orm.updated_at,
        )

    async def get_all_sections(self) -> Dict[str, SiteSection]:
        stmt = select(SiteSectionORM)
        result = await self._session.execute(stmt)
        sections = {}
        for orm in result.scalars().all():
            try:
                content = json.loads(orm.content_json)
            except Exception:
                content = {}
            sections[orm.section_key] = SiteSection(
                section_key=orm.section_key,
                content=content,
                updated_at=orm.updated_at,
            )
        return sections

    async def save_section(self, section: SiteSection) -> SiteSection:
        existing = await self._session.get(SiteSectionORM, section.section_key)
        content_json_str = json.dumps(section.content)
        if existing:
            existing.content_json = content_json_str
            existing.updated_at = section.updated_at
            await self._session.flush()
            return section
        else:
            orm = SiteSectionORM(
                section_key=section.section_key,
                content_json=content_json_str,
                updated_at=section.updated_at,
            )
            self._session.add(orm)
            await self._session.flush()
            return section
