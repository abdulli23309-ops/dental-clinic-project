from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.deps import get_current_user, get_storage_service, get_user_repository
from app.application.dtos.auth_dto import CompleteOnboardingRequest, UserResponse
from app.domain.models.user import User
from app.domain.repositories.user_repo import UserRepository
from app.domain.services.storage_service import StorageService
from app.api.v1.endpoints.auth import _map_user_response

router = APIRouter(prefix="/users", tags=["Users"])


class UpdateAvatarRequest(BaseModel):
    avatarUrl: Optional[str] = None


@router.patch("/me/avatar", response_model=UserResponse)
async def update_my_avatar(
    req: UpdateAvatarRequest,
    current_user: User = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
) -> UserResponse:
    """
    Sets or resets the authenticated user's personal account avatar.
    Passing null or empty string resets the avatar to the Team default portrait.
    """
    current_user.avatar_url = req.avatarUrl.strip() if req.avatarUrl and req.avatarUrl.strip() else None
    updated_user = await user_repo.save(current_user)
    return _map_user_response(updated_user)


@router.post("/me/avatar", response_model=UserResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
    storage_service: StorageService = Depends(get_storage_service),
) -> UserResponse:
    """
    Uploads an image file for the authenticated user's personal account avatar.
    Stores the file via configured storage service and persists to user.avatar_url.
    Strictly isolated from public clinician photos in Our Team.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload payload.",
        )

    file_bytes = await file.read()
    content_type = file.content_type or "image/jpeg"

    url = await storage_service.upload(
        file_bytes=file_bytes,
        original_filename=file.filename,
        content_type=content_type,
    )

    current_user.avatar_url = url
    updated_user = await user_repo.save(current_user)
    return _map_user_response(updated_user)


@router.patch("/me/onboarding", response_model=UserResponse)
async def complete_onboarding(
    req: CompleteOnboardingRequest,
    current_user: User = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
) -> UserResponse:
    """
    Marks user onboarding as permanently completed in the database.
    Updates the user's personal display name if provided, ensuring
    the onboarding modal will never trigger again for this account.
    """
    current_user.has_completed_onboarding = True
    if req.displayName and req.displayName.strip():
        current_user.full_name = req.displayName.strip()

    updated_user = await user_repo.save(current_user)
    return _map_user_response(updated_user)

