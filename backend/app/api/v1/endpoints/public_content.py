from typing import List
from fastapi import APIRouter, Depends

from app.api.deps import (
    get_cms_service,
    get_organization_service,
    get_service_service,
    get_team_service,
)
from app.application.dtos.cms_dto import FaqResponse, PublicCmsResponse
from app.application.dtos.organization_dto import LocationResponse
from app.application.dtos.service_dto import ServiceResponse
from app.application.dtos.team_dto import TeamMemberResponse
from app.application.services.cms_service import CmsService
from app.application.services.organization_service import OrganizationService
from app.application.services.service_service import ServiceService
from app.application.services.team_service import TeamService

router = APIRouter(prefix="/public", tags=["Public Content"])


@router.get("/content", response_model=PublicCmsResponse)
async def get_site_content(
    cms_service: CmsService = Depends(get_cms_service),
) -> PublicCmsResponse:
    """Returns database-backed CMS copy for public frontend rendering."""
    return await cms_service.get_public_cms()


@router.get("/services", response_model=List[ServiceResponse])
async def get_public_services(
    service_service: ServiceService = Depends(get_service_service),
) -> List[ServiceResponse]:
    """Returns all active dental procedures for public display and booking."""
    services = await service_service.list_services(include_inactive=False, public_only=True)
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


@router.get("/team", response_model=List[TeamMemberResponse])
async def get_public_team(
    team_service: TeamService = Depends(get_team_service),
) -> List[TeamMemberResponse]:
    """Returns all active clinicians and staff for public display."""
    members = await team_service.list_members(include_inactive=False)
    return [
        TeamMemberResponse(
            id=m.id,
            organizationId=m.organization_id,
            locationId=m.location_id,
            firstName=m.first_name,
            lastName=m.last_name,
            displayName=m.display_name,
            professionalTitle=m.professional_title,
            role=m.role,
            specialties=m.specialties,
            biography=m.biography,
            photoUrl=m.photo_url,
            education=m.education,
            credentials=m.credentials,
            licenseNumber=m.license_number,
            licenseState=m.license_state,
            servicesOffered=m.services_offered,
            displayOrder=m.display_order,
            isActive=m.is_active,
            createdAt=m.created_at,
            updatedAt=m.updated_at,
        )
        for m in members
    ]


@router.get("/locations", response_model=List[LocationResponse])
async def get_public_locations(
    org_service: OrganizationService = Depends(get_organization_service),
) -> List[LocationResponse]:
    """Returns all active office locations."""
    locations = await org_service.list_locations(include_inactive=False)
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


@router.get("/faq", response_model=List[FaqResponse])
async def get_public_faqs(
    cms_service: CmsService = Depends(get_cms_service),
) -> List[FaqResponse]:
    """Returns all active FAQ items."""
    faqs = await cms_service.list_faqs(include_inactive=False)
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
