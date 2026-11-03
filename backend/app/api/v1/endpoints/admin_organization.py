from typing import List, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import (
    get_organization_service,
    get_cms_service,
    require_admin,
    require_platform_owner,
    get_clinic_service_repository,
    get_service_service,
)
from app.application.services.cms_service import CmsService
from app.domain.repositories.clinic_service_repo import ClinicServiceRepository
from app.application.services.service_service import ServiceService
from app.application.dtos.organization_dto import (
    LocationServiceItemDto,
    LocationServicesUpdateRequest,
    LocationCreateRequest,
    LocationResponse,
    LocationUpdateRequest,
    OrganizationResponse,
    OrganizationUpdateRequest,
    PaginatedLocationResponse,
)
from app.application.dtos.team_dto import TeamMemberStatusRequest
from app.application.services.organization_service import OrganizationService

router = APIRouter(prefix="/admin", tags=["Admin Organization"], dependencies=[Depends(require_admin)])


@router.get("/organization", response_model=OrganizationResponse)
async def get_organization(
    org_service: OrganizationService = Depends(get_organization_service),
    cms_service: CmsService = Depends(get_cms_service),
) -> OrganizationResponse:
    """Retrieves top-level practice details. 404 if no organization configured."""
    org = await org_service.get_organization()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization configured. Create the organization profile first.",
        )
    cms_general = {}
    try:
        cms_general = await cms_service.get_section("general")
    except Exception:
        pass
    logo_url = org.logo_url or (cms_general.get("logoUrl") if cms_general else None)
    short_brand_name = (
        (cms_general.get("shortBrandName") if cms_general else None)
        or org.display_name
        or org.name
    )
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        displayName=org.display_name,
        shortBrandName=short_brand_name,
        tagline=org.tagline or (cms_general.get("tagline") if cms_general else None),
        description=org.description,
        logoUrl=logo_url,
        contactEmail=org.contact_email or (cms_general.get("email") if cms_general else None),
        contactPhone=org.contact_phone or (cms_general.get("phone") if cms_general else None),
        websiteUrl=org.website_url,
        primaryColor=org.primary_color,
        secondaryColor=org.secondary_color,
        backgroundColor=org.background_color,
        primaryFont=org.primary_font,
        secondaryFont=org.secondary_font,
        isActive=org.is_active,
        createdAt=org.created_at,
        updatedAt=org.updated_at,
    )


@router.put("/organization", response_model=OrganizationResponse)
async def update_organization(
    req: OrganizationUpdateRequest,
    org_service: OrganizationService = Depends(get_organization_service),
    cms_service: CmsService = Depends(get_cms_service),
) -> OrganizationResponse:
    """Updates practice details."""
    if req.shortBrandName is not None or req.logoUrl is not None:
        try:
            cms_general = await cms_service.get_section("general")
            if req.shortBrandName is not None:
                cms_general["shortBrandName"] = req.shortBrandName.strip() or None
            if req.logoUrl is not None:
                cms_general["logoUrl"] = req.logoUrl.strip() or None
            await cms_service.update_section("general", cms_general)
        except Exception:
            pass

    org = await org_service.update_organization(req)
    cms_general = {}
    try:
        cms_general = await cms_service.get_section("general")
    except Exception:
        pass
    logo_url = org.logo_url or (cms_general.get("logoUrl") if cms_general else None)
    short_brand_name = (
        (cms_general.get("shortBrandName") if cms_general else None)
        or org.display_name
        or org.name
    )
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        displayName=org.display_name,
        shortBrandName=short_brand_name,
        tagline=org.tagline or (cms_general.get("tagline") if cms_general else None),
        description=org.description,
        logoUrl=logo_url,
        contactEmail=org.contact_email or (cms_general.get("email") if cms_general else None),
        contactPhone=org.contact_phone or (cms_general.get("phone") if cms_general else None),
        websiteUrl=org.website_url,
        primaryColor=org.primary_color,
        secondaryColor=org.secondary_color,
        backgroundColor=org.background_color,
        primaryFont=org.primary_font,
        secondaryFont=org.secondary_font,
        isActive=org.is_active,
        createdAt=org.created_at,
        updatedAt=org.updated_at,
    )


@router.get("/locations", response_model=Union[PaginatedLocationResponse, List[LocationResponse]])
async def list_all_locations(
    page: Optional[int] = Query(None, ge=1, description="Page number starting at 1"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search filter by name, city, or address"),
    org_service: OrganizationService = Depends(get_organization_service),
) -> Union[PaginatedLocationResponse, List[LocationResponse]]:
    """Lists all locations including inactive ones with optional pagination."""
    locations = await org_service.list_locations(include_inactive=True)
    all_responses = [
        LocationResponse(
            id=loc.id,
            organizationId=loc.organization_id,
            name=loc.name,
            addressLine1=loc.address_line1,
            addressLine2=loc.address_line2,
            city=loc.city,
            state=loc.state,
            postalCode=loc.postal_code,
            country=loc.country,
            phone=loc.phone,
            email=loc.email,
            hoursInfo=loc.hours_info,
            imageUrl=loc.image_url,
            isPrimary=loc.is_primary,
            isActive=loc.is_active,
            displayOrder=loc.display_order,
            createdAt=loc.created_at,
            updatedAt=loc.updated_at,
        )
        for loc in locations
    ]
    if search:
        q = search.strip().lower()
        all_responses = [
            loc for loc in all_responses
            if q in loc.name.lower()
            or q in loc.city.lower()
            or q in loc.addressLine1.lower()
            or (loc.email and q in loc.email.lower())
        ]

    if page is not None or limit is not None:
        p = page or 1
        l = limit or 20
        total = len(all_responses)
        start = (p - 1) * l
        items = all_responses[start : start + l]
        return PaginatedLocationResponse(items=items, total=total, page=p, limit=l)

    return all_responses


@router.post("/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_platform_owner)])
async def create_location(
    req: LocationCreateRequest,
    org_service: OrganizationService = Depends(get_organization_service),
) -> LocationResponse:
    """Adds a new clinic location."""
    loc = await org_service.create_location(req)
    return LocationResponse(
        id=loc.id,
        organizationId=loc.organization_id,
        name=loc.name,
        addressLine1=loc.address_line1,
        addressLine2=loc.address_line2,
        city=loc.city,
        state=loc.state,
        postalCode=loc.postal_code,
        country=loc.country,
        phone=loc.phone,
        email=loc.email,
        hoursInfo=loc.hours_info,
        imageUrl=loc.image_url,
        isPrimary=loc.is_primary,
        isActive=loc.is_active,
        displayOrder=loc.display_order,
        createdAt=loc.created_at,
        updatedAt=loc.updated_at,
    )


@router.put("/locations/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: UUID,
    req: LocationUpdateRequest,
    org_service: OrganizationService = Depends(get_organization_service),
) -> LocationResponse:
    """Updates an existing clinic location."""
    loc = await org_service.update_location(location_id, req)
    return LocationResponse(
        id=loc.id,
        organizationId=loc.organization_id,
        name=loc.name,
        addressLine1=loc.address_line1,
        addressLine2=loc.address_line2,
        city=loc.city,
        state=loc.state,
        postalCode=loc.postal_code,
        country=loc.country,
        phone=loc.phone,
        email=loc.email,
        hoursInfo=loc.hours_info,
        imageUrl=loc.image_url,
        isPrimary=loc.is_primary,
        isActive=loc.is_active,
        displayOrder=loc.display_order,
        createdAt=loc.created_at,
        updatedAt=loc.updated_at,
    )


@router.patch("/locations/{location_id}/status", response_model=LocationResponse)
async def toggle_location_status(
    location_id: UUID,
    req: TeamMemberStatusRequest,
    org_service: OrganizationService = Depends(get_organization_service),
) -> LocationResponse:
    """Soft deletes (deactivates) or reactivates a clinic location."""
    loc = await org_service.set_location_status(location_id, req.isActive)
    return LocationResponse(
        id=loc.id,
        organizationId=loc.organization_id,
        name=loc.name,
        addressLine1=loc.address_line1,
        addressLine2=loc.address_line2,
        city=loc.city,
        state=loc.state,
        postalCode=loc.postal_code,
        country=loc.country,
        phone=loc.phone,
        email=loc.email,
        hoursInfo=loc.hours_info,
        imageUrl=loc.image_url,
        isPrimary=loc.is_primary,
        isActive=loc.is_active,
        displayOrder=loc.display_order,
        createdAt=loc.created_at,
        updatedAt=loc.updated_at,
    )


@router.delete("/organization", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_platform_owner)])
async def delete_organization(
    org_service: OrganizationService = Depends(get_organization_service),
) -> None:
    """Deletes the configured organization (admin-only)."""
    org = await org_service.get_organization()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization configured.",
        )
    await org_service.delete_organization(org.id)
    return None


@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_platform_owner)])
async def delete_location(
    location_id: UUID,
    org_service: OrganizationService = Depends(get_organization_service),
) -> None:
    """Deletes a clinic location (admin-only)."""
    await org_service.get_location(location_id)  # raises 404 if missing
    await org_service.delete_location(location_id)
    return None


@router.get("/organization/setup-status")
async def organization_setup_status(
    org_service: OrganizationService = Depends(get_organization_service),
) -> dict:
    """Reports whether the organization has been configured."""
    org = await org_service.get_organization()
    return {"isConfigured": org is not None, "organization": org}


@router.get("/locations/{location_id}/services", response_model=List[LocationServiceItemDto])
async def get_location_services(
    location_id: UUID,
    org_service: OrganizationService = Depends(get_organization_service),
    service_service: ServiceService = Depends(get_service_service),
    clinic_service_repo: ClinicServiceRepository = Depends(get_clinic_service_repository),
) -> List[LocationServiceItemDto]:
    """Retrieves all catalog services with isOffered flag for this specific location."""
    await org_service.get_location(location_id)
    all_services = await service_service.list_services(include_inactive=False, public_only=False)
    offered_links = await clinic_service_repo.list_by_clinic(location_id)
    offered_set = {link.service_id for link in offered_links}

    return [
        LocationServiceItemDto(
            id=s.id,
            title=s.title,
            slug=s.slug,
            category=s.category,
            duration=s.duration,
            cashPrice=s.cash_price,
            isOffered=s.id in offered_set,
        )
        for s in all_services
    ]


@router.put("/locations/{location_id}/services", response_model=List[LocationServiceItemDto])
async def update_location_services(
    location_id: UUID,
    req: LocationServicesUpdateRequest,
    org_service: OrganizationService = Depends(get_organization_service),
    service_service: ServiceService = Depends(get_service_service),
    clinic_service_repo: ClinicServiceRepository = Depends(get_clinic_service_repository),
) -> List[LocationServiceItemDto]:
    """Updates which catalog services are enabled at this branch."""
    await org_service.get_location(location_id)
    await clinic_service_repo.set_clinic_services(clinic_id=location_id, service_ids=req.serviceIds)
    all_services = await service_service.list_services(include_inactive=False, public_only=False)
    req_set = set(req.serviceIds)

    return [
        LocationServiceItemDto(
            id=s.id,
            title=s.title,
            slug=s.slug,
            category=s.category,
            duration=s.duration,
            cashPrice=s.cash_price,
            isOffered=s.id in req_set,
        )
        for s in all_services
    ]
