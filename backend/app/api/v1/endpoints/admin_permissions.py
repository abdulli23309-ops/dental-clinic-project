from typing import Any, Dict, List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db_session
from app.infrastructure.database.orm_models import PermissionORM, RoleORM, RolePermissionORM

router = APIRouter(prefix="/admin/permissions", tags=["Admin Permissions"], dependencies=[Depends(require_admin)])

CORE_ROLES = ["Patient", "Receptionist", "Doctor", "Admin"]

CORE_PERMISSIONS = [
    {
        "code": "appointments:book",
        "name": "Book New Appointments",
        "module": "Appointments",
        "description": "Schedule clinic visits, initial exams, and treatments.",
    },
    {
        "code": "appointments:cancel",
        "name": "Reschedule & Cancel Appointments",
        "module": "Appointments",
        "description": "Modify patient booking times or cancel upcoming bookings.",
    },
    {
        "code": "appointments:view_all",
        "name": "View All Clinic Appointments",
        "module": "Appointments",
        "description": "Access the comprehensive calendar for all operatory rooms.",
    },
    {
        "code": "records:view",
        "name": "View Patient Records",
        "module": "Patient Care",
        "description": "Read dental histories, chart notes, and treatment summaries.",
    },
    {
        "code": "records:edit",
        "name": "Update Patient Records & Charts",
        "module": "Patient Care",
        "description": "Add diagnostic observations, periodontal measurements, and notes.",
    },
    {
        "code": "leads:manage",
        "name": "Triage Inquiries & Leads",
        "module": "Front Desk",
        "description": "Manage inbound inquiries, call requests, and booking pipeline.",
    },
    {
        "code": "services:edit",
        "name": "Configure Services & Fees",
        "module": "Clinic Setup",
        "description": "Edit procedure titles, descriptions, and cash pricing schedules.",
    },
    {
        "code": "team:manage",
        "name": "Manage Clinicians & Staff",
        "module": "Team Management",
        "description": "Add, edit, or adjust profiles for doctors and front-desk staff.",
    },
    {
        "code": "cms:edit",
        "name": "Update Website CMS & Marquee",
        "module": "Marketing & CMS",
        "description": "Publish announcements, FAQs, and public clinic page content.",
    },
    {
        "code": "theming:edit",
        "name": "Configure Organization Theming",
        "module": "Administration",
        "description": "Adjust global brand palette, background colors, and typography.",
    },
    {
        "code": "system:configure",
        "name": "System Security & Inactivity Settings",
        "module": "Administration",
        "description": "Manage session timeout policies, warnings, and security rules.",
    },
]

DEFAULT_ASSIGNMENTS: Dict[str, List[str]] = {
    "Patient": [
        "appointments:book",
        "appointments:cancel",
    ],
    "Receptionist": [
        "appointments:book",
        "appointments:cancel",
        "appointments:view_all",
        "records:view",
        "leads:manage",
    ],
    "Doctor": [
        "appointments:view_all",
        "records:view",
        "records:edit",
        "services:edit",
    ],
    "Admin": [p["code"] for p in CORE_PERMISSIONS],
}


class PermissionItem(BaseModel):
    id: UUID
    code: str
    name: str
    module: str
    description: str


class PermissionsMatrixResponse(BaseModel):
    roles: List[str]
    permissions: List[PermissionItem]
    matrix: Dict[str, List[str]]


class PermissionsMatrixUpdateRequest(BaseModel):
    matrix: Dict[str, List[str]]


async def ensure_roles_and_permissions(session: AsyncSession) -> Dict[str, RoleORM]:
    """Ensures core roles and permissions exist in the database."""
    role_map: Dict[str, RoleORM] = {}
    for r_name in CORE_ROLES:
        stmt = select(RoleORM).where(RoleORM.name == r_name)
        res = await session.execute(stmt)
        role = res.scalar_one_or_none()
        if not role:
            role = RoleORM(name=r_name, description=f"{r_name} role capabilities", is_system=True)
            session.add(role)
            await session.flush()
        role_map[r_name] = role

    for p in CORE_PERMISSIONS:
        stmt = select(PermissionORM).where(PermissionORM.code == p["code"])
        res = await session.execute(stmt)
        perm = res.scalar_one_or_none()
        if not perm:
            perm = PermissionORM(
                code=p["code"],
                module=p["module"],
                description=f"{p['name']}: {p['description']}",
            )
            session.add(perm)

    await session.commit()
    return role_map


@router.get("", response_model=PermissionsMatrixResponse)
async def get_permissions_matrix(
    session: AsyncSession = Depends(get_db_session),
) -> PermissionsMatrixResponse:
    """Returns the matrix of roles and their enabled permissions."""
    role_map = await ensure_roles_and_permissions(session)

    # Fetch all permissions
    perm_stmt = select(PermissionORM).order_by(PermissionORM.module, PermissionORM.code)
    perm_res = await session.execute(perm_stmt)
    perm_rows = perm_res.scalars().all()

    # Map description to name/description
    perm_items: List[PermissionItem] = []
    perm_lookup: Dict[str, PermissionORM] = {}
    for pr in perm_rows:
        perm_lookup[pr.code] = pr
        # Match with metadata
        meta = next((m for m in CORE_PERMISSIONS if m["code"] == pr.code), None)
        name = meta["name"] if meta else pr.code
        desc = meta["description"] if meta else (pr.description or "")
        perm_items.append(
            PermissionItem(
                id=pr.id,
                code=pr.code,
                name=name,
                module=pr.module,
                description=desc,
            )
        )

    # Fetch role permissions
    matrix: Dict[str, List[str]] = {r: [] for r in CORE_ROLES}

    rp_stmt = select(RolePermissionORM)
    rp_res = await session.execute(rp_stmt)
    rp_list = rp_res.scalars().all()

    # Reverse maps
    role_id_to_name = {r.id: name for name, r in role_map.items()}
    perm_id_to_code = {p.id: p.code for p in perm_rows}

    for rp in rp_list:
        r_name = role_id_to_name.get(rp.role_id)
        p_code = perm_id_to_code.get(rp.permission_id)
        if r_name and p_code:
            if p_code not in matrix[r_name]:
                matrix[r_name].append(p_code)

    # If matrix is empty (first run), populate defaults
    total_assigned = sum(len(codes) for codes in matrix.values())
    if total_assigned == 0:
        for r_name, default_codes in DEFAULT_ASSIGNMENTS.items():
            role_obj = role_map.get(r_name)
            if not role_obj:
                continue
            for c in default_codes:
                p_obj = perm_lookup.get(c)
                if p_obj:
                    session.add(RolePermissionORM(role_id=role_obj.id, permission_id=p_obj.id))
                    matrix[r_name].append(c)
        await session.commit()

    return PermissionsMatrixResponse(
        roles=CORE_ROLES,
        permissions=perm_items,
        matrix=matrix,
    )


@router.put("", response_model=PermissionsMatrixResponse)
async def update_permissions_matrix(
    payload: PermissionsMatrixUpdateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> PermissionsMatrixResponse:
    """Updates role permission assignments from the interactive UI matrix."""
    role_map = await ensure_roles_and_permissions(session)

    # Fetch all permissions
    perm_stmt = select(PermissionORM)
    perm_res = await session.execute(perm_stmt)
    perm_rows = perm_res.scalars().all()
    perm_by_code = {p.code: p for p in perm_rows}

    for role_name, assigned_codes in payload.matrix.items():
        role = role_map.get(role_name)
        if not role:
            continue

        # Get existing role_permissions for this role
        existing_rp_stmt = select(RolePermissionORM).where(RolePermissionORM.role_id == role.id)
        existing_rp_res = await session.execute(existing_rp_stmt)
        existing_rps = existing_rp_res.scalars().all()

        existing_perm_ids = {rp.permission_id: rp for rp in existing_rps}
        target_perm_ids = {perm_by_code[c].id for c in assigned_codes if c in perm_by_code}

        # Remove unassigned
        for p_id, rp in existing_perm_ids.items():
            if p_id not in target_perm_ids:
                await session.delete(rp)

        # Add newly assigned
        for p_id in target_perm_ids:
            if p_id not in existing_perm_ids:
                session.add(RolePermissionORM(role_id=role.id, permission_id=p_id))

    await session.commit()
    return await get_permissions_matrix(session)
