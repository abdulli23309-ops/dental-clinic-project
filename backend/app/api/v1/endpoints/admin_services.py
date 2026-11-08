from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, get_service_service, require_admin
from app.application.dtos.service_dto import (
    ClinicMatrixClinicItem,
    ClinicMatrixResponse,
    ClinicMatrixServiceItem,
    ServiceClinicMatrixItem,
    ServiceClinicsUpdateRequest,
    ServiceCreateRequest,
    ServiceProvidersUpdateRequest,
    ServiceResponse,
    ServiceStatusRequest,
    ServiceUpdateRequest,
)
from app.application.dtos.team_dto import ReorderRequest
from app.application.services.service_service import ServiceService
from app.domain.models.user import User
from app.infrastructure.database.orm_models import ClinicORM

router = APIRouter(prefix="/admin/services", tags=["Admin Services"], dependencies=[Depends(require_admin)])


async def _to_response(s, service_service: ServiceService) -> ServiceResponse:
    provider_ids = await service_service.get_provider_ids(s.id)
    clinic_ids = await service_service.get_clinic_ids(s.id)
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
        bookableOnline=getattr(s, "bookable_online", True),
        bufferMinutes=getattr(s, "buffer_minutes", 0),
        imageUrl=getattr(s, "image_url", None),
        providerIds=provider_ids,
        clinicIds=clinic_ids,
        createdAt=s.created_at,
        updatedAt=s.updated_at,
    )


@router.get("/clinic-matrix", response_model=ClinicMatrixResponse)
async def get_clinic_services_matrix(
    service_service: ServiceService = Depends(get_service_service),
    db_session: AsyncSession = Depends(get_db_session),
) -> ClinicMatrixResponse:
    """Returns matrix of all services mapped to offered clinics and assigned doctors."""
    clinics_res = await db_session.execute(
        select(ClinicORM).where(ClinicORM.is_active.is_(True)).order_by(ClinicORM.is_primary.desc(), ClinicORM.name.asc())
    )
    clinics = [
        ClinicMatrixClinicItem(
            id=c.id,
            name=c.name,
            city=c.city,
            isPrimary=c.is_primary,
        )
        for c in clinics_res.scalars().all()
    ]
    all_services = await service_service.list_services(include_inactive=True, public_only=False)
    matrix = []
    services_list = []
    for s in all_services:
        c_ids = await service_service.get_clinic_ids(s.id)
        p_ids = await service_service.get_provider_ids(s.id)
        matrix.append(
            ServiceClinicMatrixItem(
                serviceId=s.id,
                serviceTitle=s.title,
                serviceSlug=s.slug,
                category=s.category,
                isActive=s.is_active,
                offeredClinicIds=c_ids,
                assignedDoctorIds=p_ids,
            )
        )
        services_list.append(
            ClinicMatrixServiceItem(
                id=s.id,
                slug=s.slug,
                title=s.title,
                category=s.category,
                code=s.code,
                isActive=s.is_active,
                clinicIds=c_ids,
                providerIds=p_ids,
            )
        )
    return ClinicMatrixResponse(clinics=clinics, matrix=matrix, services=services_list)


@router.get("", response_model=List[ServiceResponse])
async def list_all_services(
    service_service: ServiceService = Depends(get_service_service),
) -> List[ServiceResponse]:
    """Lists all procedures and treatments including inactive or non-public entries."""
    services = await service_service.list_services(include_inactive=True, public_only=False)
    return [await _to_response(s, service_service) for s in services]


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    req: ServiceCreateRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Adds a new service to the practice catalog."""
    s = await service_service.create_service(req)
    return await _to_response(s, service_service)


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Retrieves full details of a specific service."""
    s = await service_service.get_service(service_id)
    return await _to_response(s, service_service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    req: ServiceUpdateRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Updates service attributes and pricing."""
    s = await service_service.update_service(service_id, req)
    return await _to_response(s, service_service)


@router.patch("/{service_id}/status", response_model=ServiceResponse)
async def toggle_service_status(
    service_id: UUID,
    req: ServiceStatusRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Soft deletes (deactivates) or reactivates a service."""
    s = await service_service.set_service_status(service_id, req.isActive)
    return await _to_response(s, service_service)


@router.patch("/reorder")
async def reorder_services(
    req: ReorderRequest,
    service_service: ServiceService = Depends(get_service_service),
) -> dict:
    """Updates the display order of services."""
    await service_service.reorder_services(req.orderedIds)
    return {"success": True}


@router.put("/{service_id}/clinics", response_model=ServiceResponse)
async def update_service_clinics(
    service_id: UUID,
    req: ServiceClinicsUpdateRequest,
    current_user: User = Depends(require_admin),
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Updates which clinics offer this catalog procedure. Audited."""
    await service_service.set_clinic_ids(service_id=service_id, clinic_ids=req.clinicIds, user_id=current_user.id)
    s = await service_service.get_service(service_id)
    return await _to_response(s, service_service)


@router.put("/{service_id}/providers", response_model=ServiceResponse)
async def update_service_providers(
    service_id: UUID,
    req: ServiceProvidersUpdateRequest,
    current_user: User = Depends(require_admin),
    service_service: ServiceService = Depends(get_service_service),
) -> ServiceResponse:
    """Updates assigned clinicians for this procedure (empty set = all active doctors at clinic). Audited."""
    await service_service.set_provider_ids(service_id=service_id, provider_ids=req.providerIds, user_id=current_user.id)
    s = await service_service.get_service(service_id)
    return await _to_response(s, service_service)
