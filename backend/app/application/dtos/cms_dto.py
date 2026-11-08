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
    shortBrandName: Optional[str] = Field(default=None, max_length=24, description="Short brand name for compact headers (max 24 chars)")
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
    heroHighlightWord: Optional[str] = None
    heroDescription: Optional[str] = None
    heroCtaText: Optional[str] = None
    heroCtaLink: Optional[str] = None
    heroSecondaryCtaText: Optional[str] = None
    heroSecondaryCtaLink: Optional[str] = None
    heroImageUrl: Optional[str] = None
    startingFee: Optional[str] = None
    heroBadges: List[str] = Field(default_factory=list)
    heroTicks: List[Dict[str, Any]] = Field(default_factory=list)
    promises: List[Dict[str, Any]] = Field(default_factory=list)

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


# ---------------------------------------------------------------------------
# Stage-2 DTOs: Reviews, Blog Posts, Social Links
# ---------------------------------------------------------------------------

ALLOWED_PLATFORMS = frozenset(
    ["facebook", "instagram", "twitter", "linkedin", "youtube", "tiktok", "whatsapp"]
)


class ReviewCreateRequest(BaseModel):
    """Schema for creating a new review (admin-only)."""

    authorName: str = Field(..., min_length=1, max_length=120)
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=1)
    reviewDate: Optional[str] = None          # ISO date string YYYY-MM-DD, optional
    sourceLabel: Optional[str] = Field(None, max_length=60)
    displayOrder: int = 0
    isPublished: bool = False

    model_config = ConfigDict(extra="ignore")


class ReviewUpdateRequest(BaseModel):
    """Schema for partially updating a review (admin-only)."""

    authorName: Optional[str] = Field(None, min_length=1, max_length=120)
    rating: Optional[int] = Field(None, ge=1, le=5)
    text: Optional[str] = None
    reviewDate: Optional[str] = None
    sourceLabel: Optional[str] = Field(None, max_length=60)
    displayOrder: Optional[int] = None
    isPublished: Optional[bool] = None

    model_config = ConfigDict(extra="ignore")


class ReviewResponse(BaseModel):
    """Full representation of a review."""

    id: UUID
    authorName: str
    rating: int
    text: str
    reviewDate: Optional[str]
    sourceLabel: Optional[str]
    displayOrder: int
    isPublished: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class BlogPostCreateRequest(BaseModel):
    """Schema for creating a new blog post (admin-only)."""

    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    excerpt: Optional[str] = None
    body: Optional[str] = None
    coverImageUrl: Optional[str] = None
    publishedDate: Optional[str] = None      # ISO date string YYYY-MM-DD, optional
    displayOrder: int = 0
    isPublished: bool = False

    model_config = ConfigDict(extra="ignore")


class BlogPostUpdateRequest(BaseModel):
    """Schema for partially updating a blog post (admin-only)."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    excerpt: Optional[str] = None
    body: Optional[str] = None
    coverImageUrl: Optional[str] = None
    publishedDate: Optional[str] = None
    displayOrder: Optional[int] = None
    isPublished: Optional[bool] = None

    model_config = ConfigDict(extra="ignore")


class BlogPostResponse(BaseModel):
    """Full representation of a blog post."""

    id: UUID
    title: str
    slug: str
    excerpt: Optional[str]
    body: Optional[str]
    coverImageUrl: Optional[str]
    publishedDate: Optional[str]
    displayOrder: int
    isPublished: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class SocialLinkCreateRequest(BaseModel):
    """Schema for creating a social link (admin-only)."""

    platform: str = Field(..., min_length=1, max_length=30)
    url: str = Field(..., min_length=8, max_length=500)
    displayOrder: int = 0
    isActive: bool = True

    model_config = ConfigDict(extra="ignore")


class SocialLinkUpdateRequest(BaseModel):
    """Schema for partially updating a social link (admin-only)."""

    platform: Optional[str] = Field(None, min_length=1, max_length=30)
    url: Optional[str] = Field(None, min_length=8, max_length=500)
    displayOrder: Optional[int] = None
    isActive: Optional[bool] = None

    model_config = ConfigDict(extra="ignore")


class SocialLinkResponse(BaseModel):
    """Full representation of a social link."""

    id: UUID
    platform: str
    url: str
    displayOrder: int
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class GalleryImageCreateRequest(BaseModel):
    """Schema for adding an image to the clinic gallery."""

    imageUrl: str = Field(..., min_length=1, max_length=500)
    caption: Optional[str] = Field(None, max_length=255)
    displayOrder: int = 0
    isActive: bool = True

    model_config = ConfigDict(extra="ignore")


class GalleryImageUpdateRequest(BaseModel):
    """Schema for updating an image in the clinic gallery."""

    imageUrl: Optional[str] = Field(None, min_length=1, max_length=500)
    caption: Optional[str] = Field(None, max_length=255)
    displayOrder: Optional[int] = None
    isActive: Optional[bool] = None

    model_config = ConfigDict(extra="ignore")


class GalleryImageResponse(BaseModel):
    """Full representation of a gallery image."""

    id: UUID
    imageUrl: str
    caption: Optional[str] = None
    displayOrder: int
    isActive: bool
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)

