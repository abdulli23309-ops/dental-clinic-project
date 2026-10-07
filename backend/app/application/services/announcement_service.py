from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import HTTPException, status

from app.application.dtos.announcement_dto import (
    AnnouncementCreateRequest,
    AnnouncementUpdateRequest,
)
from app.domain.models.announcement import Announcement
from app.domain.repositories.announcement_repo import AnnouncementRepository


class AnnouncementService:
    """Service layer managing marquee announcements."""

    def __init__(self, announcement_repo: AnnouncementRepository):
        self.repo = announcement_repo

    async def list_announcements(self, include_inactive: bool = False) -> List[Announcement]:
        return await self.repo.list_all(include_inactive=include_inactive)

    async def get_announcement(self, announcement_id: UUID) -> Announcement:
        announcement = await self.repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found.",
            )
        return announcement

    async def create_announcement(self, req: AnnouncementCreateRequest) -> Announcement:
        announcement = Announcement(
            content=req.content.strip(),
            is_active=req.isActive,
            display_order=req.displayOrder,
        )
        return await self.repo.save(announcement)

    async def update_announcement(
        self, announcement_id: UUID, req: AnnouncementUpdateRequest
    ) -> Announcement:
        announcement = await self.get_announcement(announcement_id)

        if req.content is not None:
            announcement.content = req.content.strip()
        if req.isActive is not None:
            announcement.is_active = req.isActive
        if req.displayOrder is not None:
            announcement.display_order = req.displayOrder

        announcement.updated_at = datetime.now(timezone.utc)
        return await self.repo.save(announcement)

    async def delete_announcement(self, announcement_id: UUID) -> None:
        deleted = await self.repo.delete(announcement_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found.",
            )
