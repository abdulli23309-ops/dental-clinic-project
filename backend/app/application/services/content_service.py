"""
Application service layer for Reviews, Blog Posts, and Social Links (Stage 2).
Handles validation, slug uniqueness checks, platform allow-list enforcement,
and https-only URL validation.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status

from app.application.dtos.cms_dto import (
    ALLOWED_PLATFORMS,
    BlogPostCreateRequest,
    BlogPostUpdateRequest,
    ReviewCreateRequest,
    ReviewUpdateRequest,
    SocialLinkCreateRequest,
    SocialLinkUpdateRequest,
    GalleryImageCreateRequest,
    GalleryImageUpdateRequest,
)
from app.infrastructure.database.orm_models import (
    BlogPostORM,
    GalleryImageORM,
    ReviewORM,
    SocialLinkORM,
)
from app.infrastructure.repositories.postgres_content_repo import (
    PostgresBlogPostRepository,
    PostgresGalleryRepository,
    PostgresReviewRepository,
    PostgresSocialLinkRepository,
)


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    """Parses an ISO date string (YYYY-MM-DD) to a Python date, or returns None."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date format '{value}'. Expected YYYY-MM-DD.",
        )


def _require_https_url(url: str, field: str = "url") -> None:
    """Raises 422 if the URL is not https://."""
    if not url.lower().startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' must start with https://.",
        )


class ReviewService:
    """Orchestrates review (Success Story) CRUD."""

    def __init__(self, repo: PostgresReviewRepository) -> None:
        self._repo = repo

    async def list_all(self) -> List[ReviewORM]:
        return await self._repo.list_all()

    async def list_published(self) -> List[ReviewORM]:
        return await self._repo.list_published()

    async def get_or_404(self, review_id: UUID) -> ReviewORM:
        obj = await self._repo.get_by_id(review_id)
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
        return obj

    async def create(self, req: ReviewCreateRequest) -> ReviewORM:
        orm = ReviewORM(
            id=uuid4(),
            author_name=req.authorName.strip(),
            rating=req.rating,
            review_text=req.text.strip(),
            review_date=_parse_iso_date(req.reviewDate),
            source_label=req.sourceLabel.strip() if req.sourceLabel else None,
            display_order=req.displayOrder,
            is_published=req.isPublished,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        return await self._repo.save(orm)

    async def update(self, review_id: UUID, req: ReviewUpdateRequest) -> ReviewORM:
        orm = await self.get_or_404(review_id)
        if req.authorName is not None:
            orm.author_name = req.authorName.strip()
        if req.rating is not None:
            orm.rating = req.rating
        if req.text is not None:
            orm.review_text = req.text.strip()
        if req.reviewDate is not None:
            orm.review_date = _parse_iso_date(req.reviewDate)
        if req.sourceLabel is not None:
            orm.source_label = req.sourceLabel.strip()
        if req.displayOrder is not None:
            orm.display_order = req.displayOrder
        if req.isPublished is not None:
            orm.is_published = req.isPublished
        orm.updated_at = datetime.now(timezone.utc)
        return await self._repo.save(orm)

    async def delete(self, review_id: UUID) -> None:
        orm = await self.get_or_404(review_id)
        await self._repo.delete(orm)


class BlogPostService:
    """Orchestrates blog post CRUD."""

    def __init__(self, repo: PostgresBlogPostRepository) -> None:
        self._repo = repo

    async def list_all(self) -> List[BlogPostORM]:
        return await self._repo.list_all()

    async def list_published(self) -> List[BlogPostORM]:
        return await self._repo.list_published()

    async def get_or_404(self, post_id: UUID) -> BlogPostORM:
        obj = await self._repo.get_by_id(post_id)
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found.")
        return obj

    async def get_by_slug_or_404(self, slug: str) -> BlogPostORM:
        obj = await self._repo.get_by_slug(slug)
        if not obj or not obj.is_published:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found.")
        return obj

    async def create(self, req: BlogPostCreateRequest) -> BlogPostORM:
        if await self._repo.slug_exists(req.slug):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A blog post with slug '{req.slug}' already exists.",
            )
        orm = BlogPostORM(
            id=uuid4(),
            title=req.title.strip(),
            slug=req.slug.strip(),
            excerpt=req.excerpt.strip() if req.excerpt else None,
            body=req.body,
            cover_image_url=req.coverImageUrl,
            published_date=_parse_iso_date(req.publishedDate),
            display_order=req.displayOrder,
            is_published=req.isPublished,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        return await self._repo.save(orm)

    async def update(self, post_id: UUID, req: BlogPostUpdateRequest) -> BlogPostORM:
        orm = await self.get_or_404(post_id)
        if req.slug is not None and req.slug != orm.slug:
            if await self._repo.slug_exists(req.slug, exclude_id=post_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A blog post with slug '{req.slug}' already exists.",
                )
            orm.slug = req.slug.strip()
        if req.title is not None:
            orm.title = req.title.strip()
        if req.excerpt is not None:
            orm.excerpt = req.excerpt.strip()
        if req.body is not None:
            orm.body = req.body
        if req.coverImageUrl is not None:
            orm.cover_image_url = req.coverImageUrl
        if req.publishedDate is not None:
            orm.published_date = _parse_iso_date(req.publishedDate)
        if req.displayOrder is not None:
            orm.display_order = req.displayOrder
        if req.isPublished is not None:
            orm.is_published = req.isPublished
        orm.updated_at = datetime.now(timezone.utc)
        return await self._repo.save(orm)

    async def delete(self, post_id: UUID) -> None:
        orm = await self.get_or_404(post_id)
        await self._repo.delete(orm)


class SocialLinkService:
    """Orchestrates social link CRUD."""

    def __init__(self, repo: PostgresSocialLinkRepository) -> None:
        self._repo = repo

    async def list_all(self) -> List[SocialLinkORM]:
        return await self._repo.list_all()

    async def list_active(self) -> List[SocialLinkORM]:
        return await self._repo.list_active()

    async def get_or_404(self, link_id: UUID) -> SocialLinkORM:
        obj = await self._repo.get_by_id(link_id)
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Social link not found.")
        return obj

    async def create(self, req: SocialLinkCreateRequest) -> SocialLinkORM:
        platform = req.platform.strip().lower()
        if platform not in ALLOWED_PLATFORMS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Platform '{platform}' is not allowed. Allowed: {sorted(ALLOWED_PLATFORMS)}.",
            )
        _require_https_url(req.url, "url")
        orm = SocialLinkORM(
            id=uuid4(),
            platform=platform,
            url=req.url.strip(),
            display_order=req.displayOrder,
            is_active=req.isActive,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        return await self._repo.save(orm)

    async def update(self, link_id: UUID, req: SocialLinkUpdateRequest) -> SocialLinkORM:
        orm = await self.get_or_404(link_id)
        if req.platform is not None:
            platform = req.platform.strip().lower()
            if platform not in ALLOWED_PLATFORMS:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Platform '{platform}' is not allowed. Allowed: {sorted(ALLOWED_PLATFORMS)}.",
                )
            orm.platform = platform
        if req.url is not None:
            _require_https_url(req.url, "url")
            orm.url = req.url.strip()
        if req.displayOrder is not None:
            orm.display_order = req.displayOrder
        if req.isActive is not None:
            orm.is_active = req.isActive
        orm.updated_at = datetime.now(timezone.utc)
        return await self._repo.save(orm)

    async def delete(self, link_id: UUID) -> None:
        orm = await self.get_or_404(link_id)
        await self._repo.delete(orm)


class GalleryService:
    """Orchestrates clinic gallery photo CRUD."""

    def __init__(self, repo: PostgresGalleryRepository) -> None:
        self._repo = repo

    async def list_all(self) -> List[GalleryImageORM]:
        return await self._repo.list_all()

    async def list_active(self) -> List[GalleryImageORM]:
        return await self._repo.list_active()

    async def get_or_404(self, image_id: UUID) -> GalleryImageORM:
        obj = await self._repo.get_by_id(image_id)
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery image not found.")
        return obj

    async def create(self, req: GalleryImageCreateRequest) -> GalleryImageORM:
        orm = GalleryImageORM(
            id=uuid4(),
            image_url=req.imageUrl.strip(),
            caption=req.caption.strip() if req.caption else None,
            display_order=req.displayOrder,
            is_active=req.isActive,
            created_at=datetime.now(timezone.utc),
        )
        return await self._repo.save(orm)

    async def update(self, image_id: UUID, req: GalleryImageUpdateRequest) -> GalleryImageORM:
        orm = await self.get_or_404(image_id)
        if req.imageUrl is not None:
            orm.image_url = req.imageUrl.strip()
        if req.caption is not None:
            orm.caption = req.caption.strip() or None
        if req.displayOrder is not None:
            orm.display_order = req.displayOrder
        if req.isActive is not None:
            orm.is_active = req.isActive
        return await self._repo.save(orm)

    async def delete(self, image_id: UUID) -> None:
        orm = await self.get_or_404(image_id)
        await self._repo.delete(orm)


