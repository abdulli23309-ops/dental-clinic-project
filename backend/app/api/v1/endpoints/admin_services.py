from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_service_service, require_admin
from app.application.dtos.service_dto import (
    ServiceCreateRequest,
    ServiceResponse,
    ServiceStatusRequest,
    ServiceUpdateRequest,
)
from app.application.dtos.team_dto import ReorderRequest
from app.application.services.service_service import ServiceService

router = APIRouter(prefix="/admin/services", tags=["Admin Services"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[ServiceResponse])
async def list_all_services(
    service_service: ServiceService = Depends(get_service_service),
) -> List[ServiceResponse]:
    """Lists all procedures and treatments including inactive or non-public entries."""
    services = await service_service.list_services(include_inactive=True, public_only=False)
    return [
        ServiceResponse(
            id=s.id,
            slug=s.slug,
            category=s.category,
            title=s.title,
            shortDesc=s.short_desc,
            fullDesc=s.full_desc,
            cashPrice=s.cash_price,
            duration=s.duration,
            code=s.code,
            insuranceNote=s.insurance_note,
            recommendedInterval=s.recommended_interval,
            displayOrder=s.display_order,
            isHighlighted=s.is_highlighted,
            isActive=s.is_active,
            isPublic=s.is_public,
            createdAt=s.created_at,
            updatedAt=s.updated_at,
        )
        for s in services
    ]


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    req: ServiceCreateRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Adds a new service to the practice catalog."""
    s = await service_service.create_service(req)
    return ServiceResponse(
        id=s.id,
        slug=s.slug,
        category=s.category,
        title=s.title,
        shortDesc=s.short_desc,
        fullDesc=s.full_desc,
        cashPrice=s.cash_price,
        duration=s.duration,
        code=s.code,
        insuranceNote=s.insurance_note,
        recommendedInterval=s.recommended_interval,
        displayOrder=s.display_order,
        isHighlighted=s.is_highlighted,
        isActive=s.is_active,
        isPublic=s.is_public,
        createdAt=s.created_at,
        updatedAt=s.updated_at,
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Retrieves full details of a specific service."""
    s = await service_service.get_service(service_id)
    return ServiceResponse(
        id=s.id,
        slug=s.slug,
        category=s.category,
        title=s.title,
        shortDesc=s.short_desc,
        fullDesc=s.full_desc,
        cashPrice=s.cash_price,
        duration=s.duration,
        code=s.code,
        insuranceNote=s.insurance_note,
        recommendedInterval=s.recommended_interval,
        displayOrder=s.display_order,
        isHighlighted=s.is_highlighted,
        isActive=s.is_active,
        isPublic=s.is_public,
        createdAt=s.created_at,
        updatedAt=s.updated_at,
    )


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    req: ServiceUpdateRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Updates service attributes and pricing."""
    s = await service_service.update_service(service_id, req)
    return ServiceResponse(
        id=s.id,
        slug=s.slug,
        category=s.category,
        title=s.title,
        shortDesc=s.short_desc,
        fullDesc=s.full_desc,
        cashPrice=s.cash_price,
        duration=s.duration,
        code=s.code,
        insuranceNote=s.insurance_note,
        recommendedInterval=s.recommended_interval,
        displayOrder=s.display_order,
        isHighlighted=s.is_highlighted,
        isActive=s.is_active,
        isPublic=s.is_public,
        createdAt=s.created_at,
        updatedAt=s.updated_at,
    )


@router.patch("/{service_id}/status", response_model=ServiceResponse)
async def toggle_service_status(
    service_id: UUID,
    req: ServiceStatusRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Soft deletes (deactivates) or reactivates a service."""
    s = await service_service.set_service_status(service_id, req.isActive)
    return ServiceResponse(
        id=s.id,
        slug=s.slug,
        category=s.category,
        title=s.title,
        shortDesc=s.short_desc,
        fullDesc=s.full_desc,
        cashPrice=s.cash_price,
        duration=s.duration,
        code=s.code,
        insuranceNote=s.insurance_note,
        recommendedInterval=s.recommended_interval,
        displayOrder=s.display_order,
        isHighlighted=s.is_highlighted,
        isActive=s.is_active,
        isPublic=s.is_public,
        createdAt=s.created_at,
        updatedAt=s.updated_at,
    )


@router.patch("/reorder")
async def reorder_services(
    req: ReorderRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> dict:
    """Updates the display order of services."""
    await service_service.reorder_services(req.orderedIds)
    return {"success": True}
