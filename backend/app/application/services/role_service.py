from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status

from app.application.dtos.role_dto import RoleCreateRequest, RoleResponse, RoleUpdateRequest
from app.domain.models.roles_permissions import Role
from app.domain.repositories.role_repo import RoleRepository


class RoleService:
    """Orchestrates role management operations."""

    def __init__(self, role_repo: RoleRepository):
        self.role_repo = role_repo

    async def list_roles(self, include_inactive: bool = False) -> List[RoleResponse]:
        roles = await self.role_repo.list_all(include_inactive=include_inactive)
        return [
            RoleResponse(
                id=r.id,
                name=r.name,
                displayName=r.display_name or r.name,
                description=r.description,
                displayOrder=r.display_order,
                isActive=r.is_active,
                isSystem=r.is_system,
                createdAt=r.created_at,
                updatedAt=r.updated_at,
            )
            for r in roles
        ]

    async def get_role(self, role_id: UUID) -> RoleResponse:
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found.",
            )
        return RoleResponse(
            id=role.id,
            name=role.name,
            displayName=role.display_name or role.name,
            description=role.description,
            displayOrder=role.display_order,
            isActive=role.is_active,
            isSystem=role.is_system,
            createdAt=role.created_at,
            updatedAt=role.updated_at,
        )

    async def create_role(self, req: RoleCreateRequest) -> RoleResponse:
        clean_name = req.name.strip()
        existing = await self.role_repo.get_by_name(clean_name)
        if existing:
            # If exists but inactive, we can reactivate or raise conflict
            if not existing.is_active:
                existing.is_active = True
                existing.display_name = req.get_display_name().strip()
                if req.description is not None:
                    existing.description = req.description.strip() or None
                if req.get_display_order() != 0:
                    existing.display_order = req.get_display_order()
                saved = await self.role_repo.save(existing)
                return RoleResponse(
                    id=saved.id,
                    name=saved.name,
                    displayName=saved.display_name or saved.name,
                    description=saved.description,
                    displayOrder=saved.display_order,
                    isActive=saved.is_active,
                    isSystem=saved.is_system,
                    createdAt=saved.created_at,
                    updatedAt=saved.updated_at,
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Role '{clean_name}' already exists.",
            )

        role = Role(
            name=clean_name,
            display_name=req.get_display_name().strip(),
            description=req.description.strip() if req.description else None,
            display_order=req.get_display_order(),
            is_active=req.get_is_active(),
            is_system=False,
        )
        saved = await self.role_repo.save(role)
        return RoleResponse(
            id=saved.id,
            name=saved.name,
            displayName=saved.display_name or saved.name,
            description=saved.description,
            displayOrder=saved.display_order,
            isActive=saved.is_active,
            isSystem=saved.is_system,
            createdAt=saved.created_at,
            updatedAt=saved.updated_at,
        )

    async def update_role(self, role_id: UUID, req: RoleUpdateRequest) -> RoleResponse:
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found.",
            )

        if req.name is not None and req.name.strip():
            new_name = req.name.strip()
            if new_name.lower() != role.name.lower():
                existing = await self.role_repo.get_by_name(new_name)
                if existing and existing.id != role_id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Role '{new_name}' already exists.",
                    )
            role.name = new_name

        display_name_val = req.displayName or req.display_name
        if display_name_val is not None:
            role.display_name = display_name_val.strip()

        if req.description is not None:
            role.description = req.description.strip() or None

        order_val = req.displayOrder if req.displayOrder is not None else req.display_order
        if order_val is not None:
            role.display_order = order_val

        active_val = req.isActive if req.isActive is not None else req.is_active
        if active_val is not None:
            role.is_active = active_val

        saved = await self.role_repo.save(role)
        return RoleResponse(
            id=saved.id,
            name=saved.name,
            displayName=saved.display_name or saved.name,
            description=saved.description,
            displayOrder=saved.display_order,
            isActive=saved.is_active,
            isSystem=saved.is_system,
            createdAt=saved.created_at,
            updatedAt=saved.updated_at,
        )

    async def delete_role(self, role_id: UUID) -> bool:
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found.",
            )
        # Soft delete: set is_active = False
        return await self.role_repo.delete(role_id, soft=True)

    async def validate_role_active(self, role_name: str) -> bool:
        if not role_name or not role_name.strip():
            return False
        role = await self.role_repo.get_by_name(role_name.strip())
        return bool(role and role.is_active)
