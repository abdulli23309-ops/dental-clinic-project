from typing import List, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_role_service, get_team_service, require_admin
from app.application.dtos.team_dto import (
    PaginatedTeamResponse,
    ReorderRequest,
    TeamMemberCreateRequest,
    TeamMemberResponse,
    TeamMemberStatusRequest,
    TeamMemberUpdateRequest,
)
from app.application.services.role_service import RoleService
from app.application.services.team_service import TeamService
from fastapi import HTTPException

router = APIRouter(prefix="/admin/team", tags=["Admin Team"], dependencies=[Depends(require_admin)])


@router.get("", response_model=Union[PaginatedTeamResponse, List[TeamMemberResponse]])
async def list_all_team_members(
    page: Optional[int] = Query(None, ge=1, description="Page number starting at 1"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search filter by name, title, or role"),
    team_service: TeamService = Depends(get_team_service),
) -> Union[PaginatedTeamResponse, List[TeamMemberResponse]]:
    """Lists all team members including inactive ones with optional pagination."""
    members = await team_service.list_members(include_inactive=True)
    all_responses = [
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
            showPatientsTreated=getattr(m, "show_patients_treated", True),
            createdAt=m.created_at,
            updatedAt=m.updated_at,
        )
        for m in members
    ]
    if search:
        q = search.strip().lower()
        all_responses = [
            m for m in all_responses
            if q in m.displayName.lower()
            or q in f"{m.firstName} {m.lastName}".lower()
            or q in m.professionalTitle.lower()
            or q in m.role.lower()
        ]

    if page is not None or limit is not None:
        p = page or 1
        l = limit or 20
        total = len(all_responses)
        start = (p - 1) * l
        items = all_responses[start : start + l]
        return PaginatedTeamResponse(items=items, total=total, page=p, limit=l)

    return all_responses


@router.post("", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def create_team_member(
    req: TeamMemberCreateRequest,
    team_service: TeamService = Depends(get_team_service),
    role_service: RoleService = Depends(get_role_service),
) -> TeamMemberResponse:
    """Adds a new clinical or administrative team member."""
    if not await role_service.validate_role_active(req.role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{req.role}' is not a valid active role.",
        )
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
        showPatientsTreated=getattr(m, "show_patients_treated", True),
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
        showPatientsTreated=getattr(m, "show_patients_treated", True),
        createdAt=m.created_at,
        updatedAt=m.updated_at,
    )


@router.put("/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(
    member_id: UUID,
    req: TeamMemberUpdateRequest,
    team_service: TeamService = Depends(get_team_service),
    role_service: RoleService = Depends(get_role_service),
) -> TeamMemberResponse:
    """Updates team member information."""
    if req.role is not None:
        if not await role_service.validate_role_active(req.role):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role '{req.role}' is not a valid active role.",
            )
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
        showPatientsTreated=getattr(m, "show_patients_treated", True),
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
