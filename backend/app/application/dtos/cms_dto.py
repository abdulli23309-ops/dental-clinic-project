from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class FaqCreateRequest(BaseModel):
    """Schema for adding an FAQ item."""
    category: str = Field(..., min_length=2, max_length=50)
    question: str = Field(..., min_length=5)
    answer: str = Field(..., min_length=5)
    displayOrder: int = 0
    isActive: bool = True

    model_config = ConfigDict(extra="ignore")


class FaqUpdateRequest(BaseModel):
    """Schema for updating an FAQ item."""
    category: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    displayOrder: Optional[int] = None
    isActive: Optional[bool] = None

    model_config = ConfigDict(extra="ignore")


class FaqResponse(BaseModel):
    """Full representation of an FAQ item."""
    id: UUID
    category: str
    question: str
    answer: str
    displayOrder: int
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class GeneralSectionDTO(BaseModel):
    """CMS General section configuration. Empty until the admin configures the organization."""
    practiceName: Optional[str] = None
    tagline: Optional[str] = None
    logoUrl: Optional[str] = None
    faviconUrl: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergencyPhone: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class HomepageSectionDTO(BaseModel):
    """CMS Homepage section configuration. Empty until the admin configures the organization."""
    heroEyebrow: Optional[str] = None
    heroHeading: Optional[str] = None
    heroDescription: Optional[str] = None
    heroCtaText: Optional[str] = None
    heroCtaLink: Optional[str] = None
    heroSecondaryCtaText: Optional[str] = None
    heroSecondaryCtaLink: Optional[str] = None
    heroImageUrl: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class AboutSectionDTO(BaseModel):
    """CMS About section configuration. Empty until the admin configures the organization."""
    eyebrow: Optional[str] = None
    title: Optional[str] = None
    storyParagraphs: List[str] = []
    imageUrl: Optional[str] = None
    licensureText: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class ContactSectionDTO(BaseModel):
    """CMS Contact section configuration. Empty until the admin configures the organization."""
    phone: Optional[str] = None
    email: Optional[str] = None
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    transitNote: Optional[str] = None
    hoursSummary: Optional[str] = None
    emergencyNote: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class FooterSectionDTO(BaseModel):
    """CMS Footer section configuration. Empty until the admin configures the organization."""
    tagline: Optional[str] = None
    copyrightNotice: Optional[str] = None
    cancellationPolicy: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class SeoSectionDTO(BaseModel):
    """CMS SEO configuration. Empty until the admin configures the organization."""
    siteTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    ogImageUrl: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class PublicCmsResponse(BaseModel):
    """Public aggregated CMS configuration for frontend rendering."""
    general: GeneralSectionDTO
    homepage: HomepageSectionDTO
    about: AboutSectionDTO
    contact: ContactSectionDTO
    footer: FooterSectionDTO
    seo: SeoSectionDTO
