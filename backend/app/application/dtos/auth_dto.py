from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    """Schema for user login credentials."""
    email: str = Field(..., description="User's registered email address")
    password: str = Field(..., min_length=6, description="User password")

    model_config = ConfigDict(extra="ignore")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("email must be a valid email address.")
        return clean


class UserResponse(BaseModel):
    """User profile data returned to authenticated clients."""
    id: UUID
    email: str
    fullName: str
    role: str
    isActive: bool

    model_config = ConfigDict(populate_by_name=True)


class LoginResponse(BaseModel):
    """Payload returned upon successful authentication."""
    accessToken: str
    tokenType: str = "Bearer"
    expiresInSeconds: int
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    """Optional request body if client provides refresh token via JSON instead of HttpOnly cookie."""
    refreshToken: Optional[str] = None


class TokenRefreshResponse(BaseModel):
    """Returned upon successful token rotation."""
    accessToken: str
    tokenType: str = "Bearer"
    expiresInSeconds: int
