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

SECTION_KEY_ALIASES = {
    "hero": "homepage",
}

DEFAULT_SECTIONS = {
    "general": {
        "practiceName": "Hira Dental Clinic",
        "shortBrandName": "DHDC",
        "tagline": "Precision & Compassion in Modern Dentistry",
        "logoUrl": "/media/8d90adff4feb4e8db41f532aa3d630f1.png",
        "faviconUrl": None,
        "phone": "051-6102977",
        "email": "care@hiradental.com",
        "address": "Shop No. 8 & 9, ASCON Heights, Lower Ground, Soan Garden, Block C, Islamabad.",
        "emergencyPhone": "0300-610-2977",
    },
    "homepage": {
        "heroEyebrow": "Precision & Compassion",
        "heroHeading": "World-Class Dental Excellence in Islamabad",
        "headline": "World-Class Dental Excellence in Islamabad",
        "heroHighlightWord": "Islamabad",
        "heroDescription": "Experience minimally invasive, technology-driven oral healthcare designed around patient comfort, transparent pricing, and lasting clinical outcomes.",
        "subheadline": "Experience minimally invasive, technology-driven oral healthcare designed around patient comfort, transparent pricing, and lasting clinical outcomes.",
        "heroCtaText": "Book an Appointment",
        "heroCtaLink": "#why-us",
        "heroSecondaryCtaText": "Call Clinic",
        "heroSecondaryCtaLink": "tel:0516102977",
        "heroImageUrl": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
        "image": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
        "whyChooseUsImage": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
        "startingFee": "Rs. 3,500",
        "heroBadges": [
            "Sterilization Protocols",
            "Digital Low-Dose X-Rays",
            "Painless Infiltration",
        ],
        "heroTicks": [
            {"label": "Sterilization Protocols"},
            {"label": "Digital Low-Dose X-Rays"},
            {"label": "Painless Infiltration"},
        ],
        "promises": [
            {
                "num": "01",
                "title": "Transparent Pricing & Zero Surprise Fees",
                "subtitle": "Clear Estimates Upfront",
                "description": "Every procedure has transparent, published pricing with comprehensive treatment estimates provided before care begins.",
            },
            {
                "num": "02",
                "title": "Minimally Invasive Dental Philosophy",
                "subtitle": "Preserving Natural Structure",
                "description": "We employ ultra-conservative protocols that conserve healthy tooth enamel and prioritize biological tooth preservation.",
            },
            {
                "num": "03",
                "title": "Direct Doctor Access & Continuity",
                "subtitle": "Personalized Care Partner",
                "description": "Consult directly with your assigned specialist who oversees your complete clinical lifecycle across all follow-up visits.",
            },
        ],
    },
    "about": {
        "eyebrow": "Our Heritage",
        "title": "Redefining the Dental Experience in Pakistan",
        "storyParagraphs": [
            "Founded by Dr. Hira, Hira Dental Clinic was established to elevate aesthetic, surgical, and restorative dentistry to international standards.",
            "Our multi-disciplinary team brings together board-certified specialists in endodontics, prosthodontics, periodontics, and implantology.",
        ],
        "imageUrl": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
        "licensureText": "Licensed by the Pakistan Medical and Dental Council (PMDC)",
    },
    "contact": {
        "phone": "051-6102977",
        "email": "care@hiradental.com",
        "addressLine1": "Shop No. 8 & 9, ASCON Heights, Lower Ground",
        "addressLine2": "Soan Garden, Block C, Islamabad",
        "transitNote": "Dedicated patient parking available in Lower Ground front concourse.",
        "hoursSummary": "Monday – Saturday: 9:00 AM – 9:00 PM | Sunday: 11:00 AM – 6:00 PM",
        "emergencyNote": "Emergency dental triage available 24/7 via WhatsApp or direct line.",
    },
    "footer": {
        "tagline": "Precision & Compassion in Modern Dentistry.",
        "copyrightNotice": "© 2026 Hira Dental Clinic. All clinical rights reserved.",
        "cancellationPolicy": "Cancellations made 24 hours prior to appointment time are rescheduled with zero penalty.",
    },
    "seo": {
        "siteTitle": "Hira Dental Clinic | Modern Dental Care in Islamabad",
        "metaDescription": "Leading dental clinic in Islamabad offering advanced cosmetic dentistry, dental implants, root canal therapy, and painless routine care.",
        "ogImageUrl": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
    },
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
                    # Merge with default section dict so missing keys are gracefully populated
                    merged = dict(DEFAULT_SECTIONS.get(key, {}))
                    merged.update(sections[key].content)
                    return model_cls(**merged)
                except Exception:
                    pass
            return model_cls(**DEFAULT_SECTIONS[key])

        homepage_sec = parse_section("homepage", HomepageSectionDTO)
        return PublicCmsResponse(
            general=parse_section("general", GeneralSectionDTO),
            homepage=homepage_sec,
            hero=homepage_sec,
            about=parse_section("about", AboutSectionDTO),
            contact=parse_section("contact", ContactSectionDTO),
            footer=parse_section("footer", FooterSectionDTO),
            seo=parse_section("seo", SeoSectionDTO),
        )

    async def get_section(self, section_key: str) -> Dict[str, Any]:
        clean_key = SECTION_KEY_ALIASES.get(section_key.strip().lower(), section_key.strip().lower())
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
        clean_key = SECTION_KEY_ALIASES.get(section_key.strip().lower(), section_key.strip().lower())
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
