from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.domain.models.user import User
from app.infrastructure.database.orm_models import (
    LocationORM,
    ProviderAvailabilityORM,
    TeamMemberClinicORM,
    TeamMemberORM,
)

router = APIRouter(prefix="/admin/my-schedule", tags=["Staff My Schedule"])

DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


@router.get("", response_model=Dict[str, Any])
async def get_my_schedule(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """
    Returns the weekly recurring shift schedule and assigned branch for the currently
    authenticated staff member (Doctor, Nurse, Cleaner, Receptionist, Admin).
    """
    branch_id: Optional[UUID] = current_user.clinic_id
    team_member: Optional[TeamMemberORM] = None

    # Resolve linked practitioner/staff profile if any
    if current_user.team_member_id:
        res_tm = await session.execute(
            select(TeamMemberORM).where(TeamMemberORM.id == current_user.team_member_id)
        )
        team_member = res_tm.scalar_one_or_none()
        if team_member and not branch_id:
            branch_id = team_member.location_id or team_member.clinic_id

    # If still no branch_id, check team_member_clinics
    if not branch_id and current_user.team_member_id:
        res_tmc = await session.execute(
            select(TeamMemberClinicORM)
            .where(TeamMemberClinicORM.team_member_id == current_user.team_member_id)
            .order_by(TeamMemberClinicORM.is_primary.desc())
        )
        tmc = res_tmc.scalars().first()
        if tmc:
            branch_id = tmc.clinic_id

    # Fetch branch details
    branch: Optional[LocationORM] = None
    if branch_id:
        res_loc = await session.execute(
            select(LocationORM).where(LocationORM.id == branch_id)
        )
        branch = res_loc.scalar_one_or_none()

    # Fallback to primary location or first active location
    if not branch:
        res_loc_fallback = await session.execute(
            select(LocationORM)
            .where(LocationORM.is_active.is_(True))
            .order_by(LocationORM.is_primary.desc(), LocationORM.created_at.asc())
        )
        branch = res_loc_fallback.scalars().first()

    # Fetch weekly shifts
    shifts: List[Dict[str, Any]] = []
    if current_user.team_member_id:
        res_shifts = await session.execute(
            select(ProviderAvailabilityORM)
            .where(
                ProviderAvailabilityORM.team_member_id == current_user.team_member_id,
                ProviderAvailabilityORM.is_active.is_(True),
            )
            .order_by(ProviderAvailabilityORM.day_of_week.asc())
        )
        records = res_shifts.scalars().all()
        for r in records:
            day_name = (
                DAY_NAMES[r.day_of_week]
                if 0 <= r.day_of_week < len(DAY_NAMES)
                else f"Day {r.day_of_week}"
            )
            shifts.append(
                {
                    "id": str(r.id),
                    "dayOfWeek": r.day_of_week,
                    "dayName": day_name,
                    "startTime": r.start_time,
                    "endTime": r.end_time,
                    "breakStartTime": r.break_start_time,
                    "breakEndTime": r.break_end_time,
                    "isWorking": True,
                    "branchName": branch.name if branch else "Assigned Branch",
                }
            )

    # If no custom shifts configured, provide standard clinic working days
    if not shifts:
        # Standard schedule: Monday to Friday 09:00 - 17:00, Saturday 10:00 - 15:00
        default_days = [
            (1, "Monday", "09:00", "17:00", "13:00", "14:00"),
            (2, "Tuesday", "09:00", "17:00", "13:00", "14:00"),
            (3, "Wednesday", "09:00", "17:00", "13:00", "14:00"),
            (4, "Thursday", "09:00", "17:00", "13:00", "14:00"),
            (5, "Friday", "09:00", "17:00", "13:00", "14:00"),
            (6, "Saturday", "10:00", "15:00", None, None),
        ]
        for dow, dname, st, et, bst, bet in default_days:
            shifts.append(
                {
                    "id": f"default-{dow}",
                    "dayOfWeek": dow,
                    "dayName": dname,
                    "startTime": st,
                    "endTime": et,
                    "breakStartTime": bst,
                    "breakEndTime": bet,
                    "isWorking": True,
                    "isDefaultSchedule": True,
                    "branchName": branch.name if branch else "Main Clinic Branch",
                }
            )

    return {
        "user": {
            "id": str(current_user.id),
            "fullName": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
            "teamMemberId": str(current_user.team_member_id) if current_user.team_member_id else None,
        },
        "branch": {
            "id": str(branch.id) if branch else None,
            "name": branch.name if branch else "Central Clinic Facility",
            "address": branch.address_line1 if branch else "Main Campus",
            "city": branch.city if branch else "Islamabad",
            "phone": branch.phone if branch else "+92 51 2287955",
            "hoursInfo": branch.hours_info if branch else "Mon-Sat: 09:00 - 18:00",
            "isPrimary": branch.is_primary if branch else True,
        },
        "shifts": shifts,
    }

