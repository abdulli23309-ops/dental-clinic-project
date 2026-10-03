from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status

from app.application.dtos.team_dto import TeamMemberCreateRequest, TeamMemberUpdateRequest
from app.domain.models.team_member import TeamMember
from app.domain.repositories.organization_repo import OrganizationRepository
from app.domain.repositories.team_repo import TeamMemberRepository


class TeamService:
    """Orchestrates team member management operations."""

    def __init__(
        self,
        team_repo: TeamMemberRepository,
        org_repo: OrganizationRepository,
    ):
        self.team_repo = team_repo
        self.org_repo = org_repo

    async def list_members(self, include_inactive: bool = False) -> List[TeamMember]:
        return await self.team_repo.list_all(include_inactive=include_inactive)

    async def get_member(self, member_id: UUID) -> TeamMember:
        member = await self.team_repo.get_by_id(member_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team member not found.",
            )
        return member

    async def create_member(self, req: TeamMemberCreateRequest) -> TeamMember:
        # If organizationId is not provided, associate with default practice
        org_id = req.organizationId
        if not org_id:
            org = await self.org_repo.get_current()
            if not org:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Organization must be created before adding team members.",
                )
            org_id = org.id

        member = TeamMember(
            organization_id=org_id,
            location_id=req.locationId,
            first_name=req.firstName.strip(),
            last_name=req.lastName.strip(),
            display_name=req.displayName.strip(),
            professional_title=req.professionalTitle.strip(),
            role=req.role.strip(),
            specialties=[s.strip() for s in req.specialties if s.strip()],
            biography=req.biography.strip() if req.biography else None,
            photo_url=req.photoUrl,
            education=req.education.strip() if req.education else None,
            credentials=req.credentials.strip() if req.credentials else None,
            license_number=req.licenseNumber.strip() if req.licenseNumber else None,
            license_state=req.licenseState.strip() if req.licenseState else None,
            services_offered=req.servicesOffered.strip() if req.servicesOffered else None,
            display_order=req.displayOrder,
            is_active=req.isActive,
        )
        return await self.team_repo.save(member)

    async def update_member(self, member_id: UUID, req: TeamMemberUpdateRequest) -> TeamMember:
        member = await self.get_member(member_id)

        if req.locationId is not None:
            member.location_id = req.locationId
        if req.firstName is not None:
            member.first_name = req.firstName.strip()
        if req.lastName is not None:
            member.last_name = req.lastName.strip()
        if req.displayName is not None:
            member.display_name = req.displayName.strip()
        if req.professionalTitle is not None:
            member.professional_title = req.professionalTitle.strip()
        if req.role is not None:
            member.role = req.role.strip()
        if req.specialties is not None:
            member.specialties = [s.strip() for s in req.specialties if s.strip()]
        if req.biography is not None:
            member.biography = req.biography.strip() or None
        if req.photoUrl is not None:
            member.photo_url = req.photoUrl or None
        if req.education is not None:
            member.education = req.education.strip() or None
        if req.credentials is not None:
            member.credentials = req.credentials.strip() or None
        if req.licenseNumber is not None:
            member.license_number = req.licenseNumber.strip() or None
        if req.licenseState is not None:
            member.license_state = req.licenseState.strip() or None
        if req.servicesOffered is not None:
            member.services_offered = req.servicesOffered.strip() or None
        if req.displayOrder is not None:
            member.display_order = req.displayOrder
        if req.isActive is not None:
            member.is_active = req.isActive

        member.updated_at = datetime.now(timezone.utc)
        return await self.team_repo.save(member)

    async def set_member_status(self, member_id: UUID, is_active: bool) -> TeamMember:
        member = await self.get_member(member_id)
        member.is_active = is_active
        member.updated_at = datetime.now(timezone.utc)
        return await self.team_repo.save(member)

    async def reorder_members(self, ordered_ids: List[UUID]) -> None:
        await self.team_repo.reorder(ordered_ids)
