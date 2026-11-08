from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.orm_models import ServiceORM, ServiceProviderORM, TeamMemberClinicORM


class RoleDefaultService:
    """Maps clinical roles to their default authorized services.

    Used to auto-populate ``service_providers`` when a new doctor is created
    (or when a role is set on a doctor that has no services yet).

    Design rules:
      * Defaults are applied ONLY when the doctor has no service_providers rows
        yet. Once an admin has manually assigned/unassigned services (via the
        /admin/team UI), those manual choices are respected and never
        overridden on a subsequent save.
      * Role matching is case-insensitive so legacy lowercase role values
        (e.g. "dentist", "hygienist") still resolve to their defaults.
    """

    ROLE_SERVICE_MAP: Dict[str, List[str]] = {
        "General Dentist": [
            "Cleanings & Comprehensive Exam",
            "Tooth-Colored Fillings & Crowns",
            "Gentle Endodontics (Root Canals)",
            "Invisalign Clear Aligners",
            "Professional Enamel Whitening",
            "Same-Day Emergency Triage",
        ],
        "Dentist": [
            "Cleanings & Comprehensive Exam",
            "Tooth-Colored Fillings & Crowns",
            "Gentle Endodontics (Root Canals)",
            "Invisalign Clear Aligners",
            "Professional Enamel Whitening",
            "Same-Day Emergency Triage",
        ],
        "Hygienist": [
            "Cleanings & Comprehensive Exam",
            "Professional Enamel Whitening",
        ],
        "Endodontist": [
            "Gentle Endodontics (Root Canals)",
            "Same-Day Emergency Triage",
        ],
        "Orthodontist": [
            "Invisalign Clear Aligners",
            "Cleanings & Comprehensive Exam",
        ],
        "Oral Surgeon": [
            "Same-Day Emergency Triage",
            "Tooth-Colored Fillings & Crowns",
        ],
        "Periodontist": [
            "Cleanings & Comprehensive Exam",
            "Same-Day Emergency Triage",
        ],
        "Pediatric Dentist": [
            "Cleanings & Comprehensive Exam",
            "Tooth-Colored Fillings & Crowns",
            "Same-Day Emergency Triage",
        ],
        "Cosmetic Dentist": [
            "Professional Enamel Whitening",
            "Invisalign Clear Aligners",
            "Tooth-Colored Fillings & Crowns",
        ],
        "Prosthodontist": [
            "Tooth-Colored Fillings & Crowns",
            "Invisalign Clear Aligners",
        ],
        "Implantologist": [
            "Same-Day Emergency Triage",
        ],
    }

    FALLBACK_SERVICES = ["Cleanings & Comprehensive Exam"]

    def __init__(self, session: AsyncSession):
        self.session = session

    def default_titles_for_role(self, role: Optional[str]) -> List[str]:
        """Return the list of service titles that should be defaults for a role."""
        if not role:
            return list(self.FALLBACK_SERVICES)
        key = role.strip()
        titles = self.ROLE_SERVICE_MAP.get(key)
        if titles is None:
            # Case-insensitive fallback for legacy lowercase role values.
            for k, v in self.ROLE_SERVICE_MAP.items():
                if k.lower() == key.lower():
                    titles = v
                    break
        if titles is None:
            return list(self.FALLBACK_SERVICES)
        return list(titles)

    async def get_default_service_ids(self, role: Optional[str]) -> List[UUID]:
        """Resolve default service titles for a role into active service UUIDs."""
        titles = self.default_titles_for_role(role)
        if not titles:
            return []
        stmt = select(ServiceORM.id).where(
            ServiceORM.title.in_(titles),
            ServiceORM.is_active.is_(True),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def has_any_service(self, team_member_id: UUID) -> bool:
        """Return True if the team member already has service_provider rows."""
        stmt = (
            select(ServiceProviderORM.id)
            .where(ServiceProviderORM.team_member_id == team_member_id)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def apply_defaults(
        self,
        team_member_id: UUID,
        role: Optional[str],
        clinic_id: Optional[UUID] = None,
    ) -> List[UUID]:
        """Insert default service_providers rows if the member has none yet.

        Returns the list of service_ids that were assigned (empty list when the
        member already has services, so manual overrides are preserved).
        """
        now = datetime.now(timezone.utc)

        # 1. Ensure canonical doctor multi-branch assignment exists if clinic_id is provided
        if clinic_id:
            stmt_clinic = select(TeamMemberClinicORM).where(
                TeamMemberClinicORM.team_member_id == team_member_id,
                TeamMemberClinicORM.clinic_id == clinic_id,
            )
            res_clinic = await self.session.execute(stmt_clinic)
            if not res_clinic.scalar_one_or_none():
                self.session.add(
                    TeamMemberClinicORM(
                        id=uuid4(),
                        team_member_id=team_member_id,
                        clinic_id=clinic_id,
                        is_primary=True,
                        is_active=True,
                        created_at=now,
                        updated_at=now,
                    )
                )

        # 2. Smart Defaults: auto-assign role-based services when member has no services yet
        if await self.has_any_service(team_member_id):
            await self.session.flush()
            return []

        service_ids = await self.get_default_service_ids(role)
        for sid in service_ids:
            self.session.add(
                ServiceProviderORM(
                    id=uuid4(),
                    service_id=sid,
                    team_member_id=team_member_id,
                    clinic_id=clinic_id,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
            )
        await self.session.flush()
        return service_ids
