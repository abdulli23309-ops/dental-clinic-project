from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class RoleCreateRequest(BaseModel):
    """Schema for adding a new clinical/system role."""
    name: str = Field(..., min_length=1, max_length=50)
    displayName: Optional[str] = Field(None, alias="displayName")
    display_name: Optional[str] = None
    description: Optional[str] = None
    displayOrder: Optional[int] = Field(0, alias="displayOrder")
    display_order: Optional[int] = None
    isActive: Optional[bool] = Field(True, alias="isActive")
    is_active: Optional[bool] = None

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    def get_display_name(self) -> str:
        return self.displayName or self.display_name or self.name

    def get_display_order(self) -> int:
        if self.displayOrder is not None:
            return self.displayOrder
        if self.display_order is not None:
            return self.display_order
        return 0

    def get_is_active(self) -> bool:
        if self.isActive is not None:
            return self.isActive
        if self.is_active is not None:
            return self.is_active
        return True


class RoleUpdateRequest(BaseModel):
    """Schema for updating an existing role."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    displayName: Optional[str] = Field(None, alias="displayName")
    display_name: Optional[str] = None
    description: Optional[str] = None
    displayOrder: Optional[int] = Field(None, alias="displayOrder")
    display_order: Optional[int] = None
    isActive: Optional[bool] = Field(None, alias="isActive")
    is_active: Optional[bool] = None

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class RoleResponse(BaseModel):
    """Full role representation returned to clients."""
    id: UUID
    name: str
    displayName: str = Field(..., alias="displayName")
    description: Optional[str] = None
    displayOrder: int = Field(0, alias="displayOrder")
    isActive: bool = Field(True, alias="isActive")
    isSystem: bool = Field(False, alias="isSystem")
    createdAt: Optional[datetime] = Field(None, alias="createdAt")
    updatedAt: Optional[datetime] = Field(None, alias="updatedAt")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        serialize_by_alias=True
    )
