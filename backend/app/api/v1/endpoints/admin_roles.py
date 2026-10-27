from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_role_service, require_admin
from app.application.dtos.role_dto import (
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


@router.get("", response_model=List[RoleResponse])
async def list_all_roles(
    role_service: RoleService = Depends(get_role_service),
) -> List[RoleResponse]:
    """Lists all roles including inactive ones for administration."""
    return await role_service.list_roles(include_inactive=True)


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
