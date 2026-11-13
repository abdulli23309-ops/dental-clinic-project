from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.team_dto import TeamMemberCreateRequest, TeamMemberUpdateRequest
from app.application.services.role_default_service import RoleDefaultService
from app.domain.models.team_member import TeamMember
from app.domain.repositories.organization_repo import OrganizationRepository
from app.domain.repositories.team_repo import TeamMemberRepository
from app.infrastructure.database.orm_models import TeamMemberClinicORM, TeamMemberORM


class TeamService:
    """Orchestrates team member management operations."""

    def __init__(
        self,
        team_repo: TeamMemberRepository,
        org_repo: OrganizationRepository,
        session: AsyncSession,
    ):
        self.team_repo = team_repo
        self.org_repo = org_repo
        self.session = session
        self.role_default_service = RoleDefaultService(session)

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
        # Check if doctor with same display_name already exists at the selected clinic/branch
        if req.locationId and req.displayName:
            clean_name = req.displayName.strip().lower()
            stmt_dup = (
                select(TeamMemberORM)
                .outerjoin(TeamMemberClinicORM, TeamMemberClinicORM.team_member_id == TeamMemberORM.id)
                .where(
                    func.lower(func.trim(TeamMemberORM.display_name)) == clean_name,
                    or_(
                        TeamMemberORM.location_id == req.locationId,
                        TeamMemberORM.clinic_id == req.locationId,
                        TeamMemberClinicORM.clinic_id == req.locationId,
                    ),
                )
            )
            res_dup = await self.session.execute(stmt_dup)
            if res_dup.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A doctor with this name already exists at this branch.",
                )

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
            show_patients_treated=req.showPatientsTreated,
        )
        saved = await self.team_repo.save(member)
        # Smart Defaults: auto-assign role-based services when the new member
        # has no service_providers yet (respects any manual overrides later).
        await self.role_default_service.apply_defaults(
            saved.id, saved.role, req.locationId
        )
        return saved

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
        if req.showPatientsTreated is not None:
            member.show_patients_treated = req.showPatientsTreated

        member.updated_at = datetime.now(timezone.utc)
        saved = await self.team_repo.save(member)
        # Smart Defaults: only auto-assign when the member has no services yet.
        # If services already exist (manual overrides), leave them untouched.
        await self.role_default_service.apply_defaults(
            saved.id, saved.role, saved.location_id
        )
        return saved

    async def set_member_status(self, member_id: UUID, is_active: bool) -> TeamMember:
        member = await self.get_member(member_id)
        member.is_active = is_active
        member.updated_at = datetime.now(timezone.utc)
        return await self.team_repo.save(member)

    async def reorder_members(self, ordered_ids: List[UUID]) -> None:
        await self.team_repo.reorder(ordered_ids)

    async def delete_member(self, member_id: UUID) -> None:
        member = await self.team_repo.get_by_id(member_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team member not found.",
            )
        # Pre-flight check: Query RESTRICT clinical tables
        from app.infrastructure.database.orm_models import (
            ClinicalEncounterORM,
            ClinicalNoteORM,
            DentalChartFindingORM,
            DentalProcedureORM,
            UserORM,
            BookingORM,
            LeadORM,
        )
        from sqlalchemy import update

        # Pre-flight check: Medico-legal clinical records guard
        checks = [
            (ClinicalEncounterORM, ClinicalEncounterORM.clinician_id == member_id, "clinical encounters"),
            (ClinicalNoteORM, (ClinicalNoteORM.author_id == member_id) | (ClinicalNoteORM.signed_by_id == member_id), "clinical notes"),
            (DentalChartFindingORM, (DentalChartFindingORM.author_id == member_id) | (DentalChartFindingORM.corrected_by_id == member_id) | (DentalChartFindingORM.resolved_by_id == member_id), "dental chart findings"),
            (DentalProcedureORM, (DentalProcedureORM.completed_by_id == member_id) | (DentalProcedureORM.recorded_by_id == member_id), "dental procedures"),
        ]

        for model_cls, condition, label in checks:
            stmt = select(func.count()).select_from(model_cls).where(condition)
            count = (await self.session.execute(stmt)).scalar() or 0
            if count > 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot permanently delete a clinician with signed patient {label}. Please Deactivate them instead.",
                )

        # Nullify any soft references before delete
        await self.session.execute(
            update(UserORM).where(UserORM.team_member_id == member_id).values(team_member_id=None)
        )
        await self.session.execute(
            update(BookingORM).where(BookingORM.team_member_id == member_id).values(team_member_id=None)
        )
        await self.session.execute(
            update(LeadORM).where(LeadORM.team_member_id == member_id).values(team_member_id=None)
        )

        await self.team_repo.delete(member_id)
