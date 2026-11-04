from typing import List, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_role_service, require_admin
from app.application.dtos.role_dto import (
    PaginatedRolesResponse,
    RoleCreateRequest,
    RoleResponse,
    RoleUpdateRequest,
)
from app.application.services.role_service import RoleService

router = APIRouter(
    prefix="/admin/roles",
    tags=["Admin Roles"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=Union[PaginatedRolesResponse, List[RoleResponse]])
async def list_all_roles(
    page: Optional[int] = Query(None, ge=1, description="Page number starting at 1"),
    per_page: Optional[int] = Query(None, ge=1, le=100, description="Items per page (max 100)"),
    search: Optional[str] = Query(None, description="Search filter by name or description"),
    role_service: RoleService = Depends(get_role_service),
) -> Union[PaginatedRolesResponse, List[RoleResponse]]:
    """
    Lists all roles including inactive ones for administration.
    If page or per_page is provided, returns PaginatedRolesResponse with total count and paging info.
    If neither is provided, returns a flat List[RoleResponse] preserving backward compatibility.
    """
    all_roles = await role_service.list_roles(include_inactive=True)

    if search and search.strip():
        q = search.strip().lower()
        all_roles = [
            r for r in all_roles
            if q in r.name.lower()
            or (r.displayName and q in r.displayName.lower())
            or (r.description and q in r.description.lower())
        ]

    if page is not None or per_page is not None:
        p = page or 1
        pp = min(per_page or 12, 100)
        total = len(all_roles)
        total_pages = max(1, (total + pp - 1) // pp) if total > 0 else 1
        start = (p - 1) * pp
        items = all_roles[start : start + pp]
        return PaginatedRolesResponse(
            items=items,
            total=total,
            page=p,
            per_page=pp,
            total_pages=total_pages,
        )

    return all_roles


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    req: RoleCreateRequest,
    role_service: RoleService = Depends(get_role_service),
) -> RoleResponse:
    """Creates a new role."""
    return await role_service.create_role(req)


@router.patch("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    req: RoleUpdateRequest,
    role_service: RoleService = Depends(get_role_service),
) -> RoleResponse:
    """Updates an existing role."""
    return await role_service.update_role(role_id, req)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: UUID,
    role_service: RoleService = Depends(get_role_service),
) -> None:
    """Soft deletes a role by setting is_active = False."""
    await role_service.delete_role(role_id)
