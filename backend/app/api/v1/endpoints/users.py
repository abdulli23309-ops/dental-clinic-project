from fastapi import APIRouter, Depends
from app.api.deps import get_current_user, get_user_repository
from app.application.dtos.auth_dto import CompleteOnboardingRequest, UserResponse
from app.domain.models.user import User
from app.domain.repositories.user_repo import UserRepository
from app.api.v1.endpoints.auth import _map_user_response

router = APIRouter(prefix="/users", tags=["Users"])


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

