from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status

from app.application.dtos.cms_dto import (
    AboutSectionDTO,
    ContactSectionDTO,
    FaqCreateRequest,
    FaqUpdateRequest,
    FooterSectionDTO,
    GeneralSectionDTO,
    HomepageSectionDTO,
    PublicCmsResponse,
    SeoSectionDTO,
)
from app.domain.models.cms import FaqItem, SiteSection
from app.domain.repositories.cms_repo import CmsRepository

DEFAULT_SECTIONS = {
    "general": GeneralSectionDTO().model_dump(),
    "homepage": HomepageSectionDTO().model_dump(),
    "about": AboutSectionDTO().model_dump(),
    "contact": ContactSectionDTO().model_dump(),
    "footer": FooterSectionDTO().model_dump(),
    "seo": SeoSectionDTO().model_dump(),
}


class CmsService:
    """Orchestrates website content management and FAQ operations."""

    def __init__(self, cms_repo: CmsRepository):
        self.cms_repo = cms_repo

    async def get_public_cms(self) -> PublicCmsResponse:
        """Assembles aggregated public site content with graceful fallbacks."""
        sections = await self.cms_repo.get_all_sections()

        def parse_section(key: str, model_cls):
            if key in sections and sections[key].content:
                try:
                    return model_cls(**sections[key].content)
                except Exception:
                    pass
            return model_cls(**DEFAULT_SECTIONS[key])

        return PublicCmsResponse(
            general=parse_section("general", GeneralSectionDTO),
            homepage=parse_section("homepage", HomepageSectionDTO),
            about=parse_section("about", AboutSectionDTO),
            contact=parse_section("contact", ContactSectionDTO),
            footer=parse_section("footer", FooterSectionDTO),
            seo=parse_section("seo", SeoSectionDTO),
        )

    async def get_section(self, section_key: str) -> Dict[str, Any]:
        clean_key = section_key.strip().lower()
        if clean_key not in DEFAULT_SECTIONS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown CMS section '{section_key}'. Allowed: {', '.join(DEFAULT_SECTIONS.keys())}",
            )
        section = await self.cms_repo.get_section(clean_key)
        if section:
            # Merge with defaults so any missing fields are present
            data = dict(DEFAULT_SECTIONS[clean_key])
            data.update(section.content)
            return data
        return DEFAULT_SECTIONS[clean_key]

    async def update_section(self, section_key: str, content: Dict[str, Any]) -> Dict[str, Any]:
        clean_key = section_key.strip().lower()
        if clean_key not in DEFAULT_SECTIONS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown CMS section '{section_key}'. Allowed: {', '.join(DEFAULT_SECTIONS.keys())}",
            )

        # Validate against schema
        validator_map = {
            "general": GeneralSectionDTO,
            "homepage": HomepageSectionDTO,
            "about": AboutSectionDTO,
            "contact": ContactSectionDTO,
            "footer": FooterSectionDTO,
            "seo": SeoSectionDTO,
        }
        validated = validator_map[clean_key](**content)
        validated_dict = validated.model_dump()

        site_section = SiteSection(
            section_key=clean_key,
            content=validated_dict,
            updated_at=datetime.now(timezone.utc),
        )
        saved = await self.cms_repo.save_section(site_section)
        return saved.content

    # FAQ management
    async def list_faqs(self, include_inactive: bool = False) -> List[FaqItem]:
        return await self.cms_repo.list_faqs(include_inactive=include_inactive)

    async def get_faq(self, faq_id: UUID) -> FaqItem:
        faq = await self.cms_repo.get_faq_by_id(faq_id)
        if not faq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="FAQ item not found.",
            )
        return faq

    async def create_faq(self, req: FaqCreateRequest) -> FaqItem:
        faq = FaqItem(
            category=req.category.strip().lower(),
            question=req.question.strip(),
            answer=req.answer.strip(),
            display_order=req.displayOrder,
            is_active=req.isActive,
        )
        return await self.cms_repo.save_faq(faq)

    async def update_faq(self, faq_id: UUID, req: FaqUpdateRequest) -> FaqItem:
        faq = await self.get_faq(faq_id)

        if req.category is not None:
            faq.category = req.category.strip().lower()
        if req.question is not None:
            faq.question = req.question.strip()
        if req.answer is not None:
            faq.answer = req.answer.strip()
        if req.displayOrder is not None:
            faq.display_order = req.displayOrder
        if req.isActive is not None:
            faq.is_active = req.isActive

        faq.updated_at = datetime.now(timezone.utc)
        return await self.cms_repo.save_faq(faq)

    async def set_faq_status(self, faq_id: UUID, is_active: bool) -> FaqItem:
        faq = await self.get_faq(faq_id)
        faq.is_active = is_active
        faq.updated_at = datetime.now(timezone.utc)
        return await self.cms_repo.save_faq(faq)

    async def reorder_faqs(self, ordered_ids: List[UUID]) -> None:
        await self.cms_repo.reorder_faqs(ordered_ids)
