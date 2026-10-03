from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_cms_service, require_admin
from app.application.dtos.cms_dto import (
    FaqCreateRequest,
    FaqResponse,
    FaqUpdateRequest,
)
from app.application.dtos.team_dto import ReorderRequest
from app.application.services.cms_service import CmsService
from app.domain.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin CMS"], dependencies=[Depends(require_admin)])


@router.get("/cms/{section}")
async def get_cms_section(
    section: str,
    cms_service: CmsService = Depends(get_cms_service),
) -> Dict[str, Any]:
    """Retrieves content for a specific CMS section (general, homepage, about, contact, footer, seo)."""
    return await cms_service.get_section(section)


@router.put("/cms/{section}")
async def update_cms_section(
    section: str,
    content: Dict[str, Any],
    cms_service: CmsService = Depends(get_cms_service),
) -> Dict[str, Any]:
    """Updates and validates content for a specific CMS section."""
    return await cms_service.update_section(section, content)


@router.get("/faq", response_model=List[FaqResponse])
async def list_all_faqs(
    cms_service: CmsService = Depends(get_cms_service),
) -> List[FaqResponse]:
    """Lists all FAQ items including inactive ones for administrative review."""
    faqs = await cms_service.list_faqs(include_inactive=True)
    return [
        FaqResponse(
            id=f.id,
            category=f.category,
            question=f.question,
            answer=f.answer,
            displayOrder=f.display_order,
            isActive=f.is_active,
            createdAt=f.created_at,
            updatedAt=f.updated_at,
        )
        for f in faqs
    ]


@router.post("/faq", response_model=FaqResponse, status_code=status.HTTP_201_CREATED)
async def create_faq(
    req: FaqCreateRequest,
    cms_service: CmsService = Depends(get_cms_service),
) -> FaqResponse:
    """Creates a new FAQ item."""
    f = await cms_service.create_faq(req)
    return FaqResponse(
        id=f.id,
        category=f.category,
        question=f.question,
        answer=f.answer,
        displayOrder=f.display_order,
        isActive=f.is_active,
        createdAt=f.created_at,
        updatedAt=f.updated_at,
    )


@router.put("/faq/{faq_id}", response_model=FaqResponse)
async def update_faq(
    faq_id: UUID,
    req: FaqUpdateRequest,
    cms_service: CmsService = Depends(get_cms_service),
) -> FaqResponse:
    """Updates an existing FAQ item."""
    f = await cms_service.update_faq(faq_id, req)
    return FaqResponse(
        id=f.id,
        category=f.category,
        question=f.question,
        answer=f.answer,
        displayOrder=f.display_order,
        isActive=f.is_active,
        createdAt=f.created_at,
        updatedAt=f.updated_at,
    )


@router.patch("/faq/{faq_id}/status", response_model=FaqResponse)
async def toggle_faq_status(
    faq_id: UUID,
    is_active: bool,
    cms_service: CmsService = Depends(get_cms_service),
) -> FaqResponse:
    """Soft deletes (deactivates) or reactivates an FAQ item."""
    f = await cms_service.set_faq_status(faq_id, is_active)
    return FaqResponse(
        id=f.id,
        category=f.category,
        question=f.question,
        answer=f.answer,
        displayOrder=f.display_order,
        isActive=f.is_active,
        createdAt=f.created_at,
        updatedAt=f.updated_at,
    )


@router.patch("/faq/reorder")
async def reorder_faqs(
    req: ReorderRequest,
    cms_service: CmsService = Depends(get_cms_service),
) -> dict:
    """Updates the display order of FAQ items."""
    await cms_service.reorder_faqs(req.orderedIds)
    return {"success": True}
