from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreateRequest(BaseModel):
    """Schema for creating a marquee announcement."""
    content: str = Field(..., min_length=1, max_length=1000)
    isActive: bool = True
    displayOrder: int = 0

    model_config = ConfigDict(extra="ignore")


class AnnouncementUpdateRequest(BaseModel):
    """Schema for updating an existing announcement."""
    content: Optional[str] = Field(None, min_length=1, max_length=1000)
    isActive: Optional[bool] = None
    displayOrder: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


class AnnouncementResponse(BaseModel):
    """Full representation of an announcement."""
    id: UUID
    content: str
    isActive: bool
    displayOrder: int
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)
