from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class TeamMemberCreateRequest(BaseModel):
    """Schema for adding a new clinical or administrative team member."""
    organizationId: Optional[UUID] = None
    locationId: Optional[UUID] = None
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)
    displayName: str = Field(..., min_length=1, max_length=255)
    professionalTitle: str = Field(..., min_length=1, max_length=150)
    role: str = Field(..., min_length=1, max_length=100)
    specialties: List[str] = Field(default_factory=list)
    biography: Optional[str] = None
    photoUrl: Optional[str] = None
    education: Optional[str] = None
    credentials: Optional[str] = None
    licenseNumber: Optional[str] = None
    licenseState: Optional[str] = None
    servicesOffered: Optional[str] = None
    displayOrder: int = 0
    isActive: bool = True

    model_config = ConfigDict(extra="ignore")


class TeamMemberUpdateRequest(BaseModel):
    """Schema for updating an existing team member."""
    locationId: Optional[UUID] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    displayName: Optional[str] = None
    professionalTitle: Optional[str] = None
    role: Optional[str] = None
    specialties: Optional[List[str]] = None
    biography: Optional[str] = None
    photoUrl: Optional[str] = None
    education: Optional[str] = None
    credentials: Optional[str] = None
    licenseNumber: Optional[str] = None
    licenseState: Optional[str] = None
    servicesOffered: Optional[str] = None
    displayOrder: Optional[int] = None
    isActive: Optional[bool] = None

    model_config = ConfigDict(extra="ignore")


class TeamMemberStatusRequest(BaseModel):
    """Schema for activating or deactivating a team member."""
    isActive: bool


class TeamMemberResponse(BaseModel):
    """Full representation of a team member returned to clients."""
    id: UUID
    organizationId: UUID
    locationId: Optional[UUID] = None
    firstName: str
    lastName: str
    displayName: str
    professionalTitle: str
    role: str
    specialties: List[str]
    biography: Optional[str] = None
    photoUrl: Optional[str] = None
    education: Optional[str] = None
    credentials: Optional[str] = None
    licenseNumber: Optional[str] = None
    licenseState: Optional[str] = None
    servicesOffered: Optional[str] = None
    displayOrder: int
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class ReorderRequest(BaseModel):
    """Payload for updating display ordering of items."""
    orderedIds: List[UUID]
