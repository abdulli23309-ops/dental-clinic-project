from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import get_auth_service, get_current_user
from app.application.dtos.auth_dto import (
    LoginRequest,
    LoginResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserResponse,
)
from app.application.services.auth_service import AuthService
from app.core.config import settings
from app.domain.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    """
    Authenticates a user with email and password.
    Returns a short-lived JWT access token in the response body, and sets
    a secure HTTP-only refresh token cookie.
    """
    access_token, refresh_token, user = await auth_service.authenticate_user(
        email=req.email,
        password=req.password,
    )

    _set_refresh_cookie(response, refresh_token)

    return LoginResponse(
        accessToken=access_token,
        tokenType="Bearer",
        expiresInSeconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            fullName=user.full_name,
            role=user.role.value,
            isActive=user.is_active,
        ),
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    request: Request,
    response: Response,
    req_body: TokenRefreshRequest = TokenRefreshRequest(),
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenRefreshResponse:
    """
    Rotates the refresh token and issues a new access token.
    Extracts the refresh token from the HTTP-only cookie, or fallback to the request body.
    """
    token_str = request.cookies.get(REFRESH_COOKIE_NAME) or req_body.refreshToken
    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found in cookies or request body.",
        )

    try:
        new_access_token, new_refresh_token, _ = await auth_service.rotate_refresh_token(token_str)
    except HTTPException:
        _clear_refresh_cookie(response)
        raise

    _set_refresh_cookie(response, new_refresh_token)

    return TokenRefreshResponse(
        accessToken=new_access_token,
        tokenType="Bearer",
        expiresInSeconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    """
    Revokes the active refresh token and clears the HTTP-only cookie.
    """
    token_str = request.cookies.get(REFRESH_COOKIE_NAME)
    if token_str:
        await auth_service.logout(token_str)

    _clear_refresh_cookie(response)
    return {"success": True, "message": "Successfully logged out."}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Returns the authenticated user's profile and active role.
    Requires a valid JWT Bearer token in the Authorization header.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        fullName=current_user.full_name,
        role=current_user.role.value,
        isActive=current_user.is_active,
    )
