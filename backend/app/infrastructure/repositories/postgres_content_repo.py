"""
PostgreSQL repository for Reviews, BlogPosts, and SocialLinks.
Thin data-access layer; all business rules live in the service.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.orm_models import (
    BlogPostORM,
    GalleryImageORM,
    ReviewORM,
    SocialLinkORM,
)


class PostgresReviewRepository:
    """CRUD access for the reviews table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> List[ReviewORM]:
        result = await self._session.execute(
            select(ReviewORM).order_by(ReviewORM.display_order, ReviewORM.created_at)
        )
        return list(result.scalars().all())

    async def list_published(self) -> List[ReviewORM]:
        result = await self._session.execute(
            select(ReviewORM)
            .where(ReviewORM.is_published.is_(True))
            .order_by(ReviewORM.display_order, ReviewORM.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, review_id: UUID) -> Optional[ReviewORM]:
        result = await self._session.execute(
            select(ReviewORM).where(ReviewORM.id == review_id)
        )
        return result.scalar_one_or_none()

    async def save(self, orm: ReviewORM) -> ReviewORM:
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return orm

    async def delete(self, orm: ReviewORM) -> None:
        await self._session.delete(orm)
        await self._session.flush()


class PostgresBlogPostRepository:
    """CRUD access for the blog_posts table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> List[BlogPostORM]:
        result = await self._session.execute(
            select(BlogPostORM).order_by(BlogPostORM.display_order, BlogPostORM.created_at)
        )
        return list(result.scalars().all())

    async def list_published(self) -> List[BlogPostORM]:
        result = await self._session.execute(
            select(BlogPostORM)
            .where(BlogPostORM.is_published.is_(True))
            .order_by(BlogPostORM.display_order, BlogPostORM.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, post_id: UUID) -> Optional[BlogPostORM]:
        result = await self._session.execute(
            select(BlogPostORM).where(BlogPostORM.id == post_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[BlogPostORM]:
        result = await self._session.execute(
            select(BlogPostORM).where(BlogPostORM.slug == slug)
        )
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str, exclude_id: Optional[UUID] = None) -> bool:
        q = select(BlogPostORM.id).where(BlogPostORM.slug == slug)
        if exclude_id:
            q = q.where(BlogPostORM.id != exclude_id)
        result = await self._session.execute(q)
        return result.scalar_one_or_none() is not None

    async def save(self, orm: BlogPostORM) -> BlogPostORM:
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return orm

    async def delete(self, orm: BlogPostORM) -> None:
        await self._session.delete(orm)
        await self._session.flush()


class PostgresSocialLinkRepository:
    """CRUD access for the social_links table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> List[SocialLinkORM]:
        result = await self._session.execute(
            select(SocialLinkORM).order_by(SocialLinkORM.display_order, SocialLinkORM.created_at)
        )
        return list(result.scalars().all())

    async def list_active(self) -> List[SocialLinkORM]:
        result = await self._session.execute(
            select(SocialLinkORM)
            .where(SocialLinkORM.is_active.is_(True))
            .order_by(SocialLinkORM.display_order, SocialLinkORM.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, link_id: UUID) -> Optional[SocialLinkORM]:
        result = await self._session.execute(
            select(SocialLinkORM).where(SocialLinkORM.id == link_id)
        )
        return result.scalar_one_or_none()

    async def save(self, orm: SocialLinkORM) -> SocialLinkORM:
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return orm

    async def delete(self, orm: SocialLinkORM) -> None:
        await self._session.delete(orm)
        await self._session.flush()


class PostgresGalleryRepository:
    """CRUD access for the gallery_images table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> List[GalleryImageORM]:
        result = await self._session.execute(
            select(GalleryImageORM).order_by(GalleryImageORM.display_order, GalleryImageORM.created_at)
        )
        return list(result.scalars().all())

    async def list_active(self) -> List[GalleryImageORM]:
        result = await self._session.execute(
            select(GalleryImageORM)
            .where(GalleryImageORM.is_active.is_(True))
            .order_by(GalleryImageORM.display_order, GalleryImageORM.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, image_id: UUID) -> Optional[GalleryImageORM]:
        result = await self._session.execute(
            select(GalleryImageORM).where(GalleryImageORM.id == image_id)
        )
        return result.scalar_one_or_none()

    async def save(self, orm: GalleryImageORM) -> GalleryImageORM:
        self._session.add(orm)
        await self._session.flush()
        await self._session.refresh(orm)
        return orm

    async def delete(self, orm: GalleryImageORM) -> None:
        await self._session.delete(orm)
        await self._session.flush()


