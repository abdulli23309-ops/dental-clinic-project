from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_organization_service, require_admin
from app.application.dtos.organization_dto import (
    LocationCreateRequest,
    LocationResponse,
    LocationUpdateRequest,
    OrganizationResponse,
    OrganizationUpdateRequest,
)
from app.application.dtos.team_dto import TeamMemberStatusRequest
from app.application.services.organization_service import OrganizationService

router = APIRouter(prefix="/admin", tags=["Admin Organization"], dependencies=[Depends(require_admin)])


@router.get("/organization", response_model=OrganizationResponse)
async def get_organization(
    org_service: OrganizationService = Depends(get_organization_service),
) -> OrganizationResponse:
    """Retrieves top-level practice details."""
    org = await org_service.get_organization()
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        displayName=org.display_name,
        tagline=org.tagline,
        description=org.description,
        logoUrl=org.logo_url,
        contactEmail=org.contact_email,
        contactPhone=org.contact_phone,
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
) -> OrganizationResponse:
    """Updates practice details."""
    org = await org_service.update_organization(req)
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        displayName=org.display_name,
        tagline=org.tagline,
        description=org.description,
        logoUrl=org.logo_url,
        contactEmail=org.contact_email,
        contactPhone=org.contact_phone,
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


@router.get("/locations", response_model=List[LocationResponse])
async def list_all_locations(
    org_service: OrganizationService = Depends(get_organization_service),
) -> List[LocationResponse]:
    """Lists all locations including inactive ones."""
    locations = await org_service.list_locations(include_inactive=True)
    return [
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
            isPrimary=loc.is_primary,
            isActive=loc.is_active,
            displayOrder=loc.display_order,
            createdAt=loc.created_at,
            updatedAt=loc.updated_at,
        )
        for loc in locations
    ]


@router.post("/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
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
        isPrimary=loc.is_primary,
        isActive=loc.is_active,
        displayOrder=loc.display_order,
        createdAt=loc.created_at,
        updatedAt=loc.updated_at,
    )
