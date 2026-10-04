from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_team_service, require_admin
from app.application.dtos.team_dto import (
    ReorderRequest,
    TeamMemberCreateRequest,
    TeamMemberResponse,
    TeamMemberStatusRequest,
    TeamMemberUpdateRequest,
)
from app.application.services.team_service import TeamService

router = APIRouter(prefix="/admin/team", tags=["Admin Team"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[TeamMemberResponse])
async def list_all_team_members(
    team_service: TeamService = Depends(get_team_service),
) -> List[TeamMemberResponse]:
    """Lists all team members including inactive ones."""
    members = await team_service.list_members(include_inactive=True)
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


@router.post("", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def create_team_member(
    req: TeamMemberCreateRequest,
    team_service: TeamService = Depends(get_team_service),
) -> TeamMemberResponse:
    """Adds a new clinical or administrative team member."""
    m = await team_service.create_member(req)
    return TeamMemberResponse(
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


@router.get("/{member_id}", response_model=TeamMemberResponse)
async def get_team_member(
    member_id: UUID,
    team_service: TeamService = Depends(get_team_service),
) -> TeamMemberResponse:
    """Retrieves full details of a specific team member."""
    m = await team_service.get_member(member_id)
    return TeamMemberResponse(
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


@router.put("/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(
    member_id: UUID,
    req: TeamMemberUpdateRequest,
    team_service: TeamService = Depends(get_team_service),
) -> TeamMemberResponse:
    """Updates team member information."""
    m = await team_service.update_member(member_id, req)
    return TeamMemberResponse(
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


@router.patch("/{member_id}/status", response_model=TeamMemberResponse)
async def toggle_team_member_status(
    member_id: UUID,
    req: TeamMemberStatusRequest,
    team_service: TeamService = Depends(get_team_service),
) -> TeamMemberResponse:
    """Soft deletes (deactivates) or reactivates a team member."""
    m = await team_service.set_member_status(member_id, req.isActive)
    return TeamMemberResponse(
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


@router.patch("/reorder")
async def reorder_team_members(
    req: ReorderRequest,
    team_service: TeamService = Depends(get_team_service),
) -> dict:
    """Updates team member presentation display order."""
    await team_service.reorder_members(req.orderedIds)
    return {"success": True}
