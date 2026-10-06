from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_announcement_service, require_admin
from app.application.dtos.announcement_dto import (
    AnnouncementCreateRequest,
    AnnouncementResponse,
    AnnouncementUpdateRequest,
)
from app.application.services.announcement_service import AnnouncementService

router = APIRouter(prefix="/admin/announcements", tags=["Admin Announcements"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[AnnouncementResponse])
async def list_announcements(
    service: AnnouncementService = Depends(get_announcement_service),
) -> List[AnnouncementResponse]:
    """Lists all announcements including inactive ones for administrative management."""
    items = await service.list_announcements(include_inactive=True)
    return [
        AnnouncementResponse(
            id=item.id,
            content=item.content,
            isActive=item.is_active,
            displayOrder=item.display_order,
            createdAt=item.created_at,
            updatedAt=item.updated_at,
        )
        for item in items
    ]


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    req: AnnouncementCreateRequest,
    service: AnnouncementService = Depends(get_announcement_service),
) -> AnnouncementResponse:
    """Creates a new marquee announcement."""
    item = await service.create_announcement(req)
    return AnnouncementResponse(
        id=item.id,
        content=item.content,
        isActive=item.is_active,
        displayOrder=item.display_order,
        createdAt=item.created_at,
        updatedAt=item.updated_at,
    )


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: UUID,
    req: AnnouncementUpdateRequest,
    service: AnnouncementService = Depends(get_announcement_service),
) -> AnnouncementResponse:
    """Updates an existing announcement."""
    item = await service.update_announcement(announcement_id, req)
    return AnnouncementResponse(
        id=item.id,
        content=item.content,
        isActive=item.is_active,
        displayOrder=item.display_order,
        createdAt=item.created_at,
        updatedAt=item.updated_at,
    )


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: UUID,
    service: AnnouncementService = Depends(get_announcement_service),
) -> None:
    """Deletes an announcement permanently."""
    await service.delete_announcement(announcement_id)
