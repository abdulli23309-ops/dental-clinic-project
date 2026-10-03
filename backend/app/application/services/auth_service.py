from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.domain.models.user import RefreshToken, User, UserRole
from app.domain.repositories.user_repo import RefreshTokenRepository, UserRepository


class AuthService:
    """
    Handles authentication workflows including credential validation,
    JWT issuance, refresh token rotation, and server-side revocation.
    """

    def __init__(
        self,
        user_repo: UserRepository,
        refresh_token_repo: RefreshTokenRepository,
    ):
        self.user_repo = user_repo
        self.refresh_token_repo = refresh_token_repo

    async def authenticate_user(self, email: str, password: str) -> Tuple[str, str, User]:
        """
        Validates login credentials. On success, issues a short-lived access token
        and a secure, persisted refresh token.
        """
        user = await self.user_repo.get_by_email(email)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Generate tokens
        access_token = create_access_token(
            subject=str(user.id),
            role=user.role.value,
        )

        raw_refresh_token = generate_refresh_token()
        token_hash = hash_refresh_token(raw_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        await self.refresh_token_repo.save(refresh_record)

        return access_token, raw_refresh_token, user

    async def rotate_refresh_token(self, raw_refresh_token: str) -> Tuple[str, str, User]:
        """
        Rotates a refresh token. Validates the old token, revokes it, and issues
        a new access token and fresh refresh token.
        """
        if not raw_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing.",
            )

        token_hash = hash_refresh_token(raw_refresh_token)
        stored_token = await self.refresh_token_repo.get_by_hash(token_hash)

        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token.",
            )

        # Detect reuse of revoked token (potential theft)
        if stored_token.is_revoked:
            # Revoke all tokens for this user as defensive measure
            await self.refresh_token_repo.revoke_all_for_user(stored_token.user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked.",
            )

        # Check expiration
        now = datetime.now(timezone.utc)
        expires_at = stored_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            await self.refresh_token_repo.revoke(stored_token.id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired.",
            )

        user = await self.user_repo.get_by_id(stored_token.user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive or disabled.",
            )

        # Create new refresh token
        new_raw_token = generate_refresh_token()
        new_hash = hash_refresh_token(new_raw_token)
        new_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_record = RefreshToken(
            user_id=user.id,
            token_hash=new_hash,
            expires_at=new_expires,
        )
        saved_new = await self.refresh_token_repo.save(new_record)

        # Revoke old token and link to replacement
        await self.refresh_token_repo.revoke(stored_token.id, replaced_by=saved_new.id)

        # Issue new access token
        new_access_token = create_access_token(
            subject=str(user.id),
            role=user.role.value,
        )

        return new_access_token, new_raw_token, user

    async def logout(self, raw_refresh_token: Optional[str]) -> None:
        """Revokes the active refresh token."""
        if not raw_refresh_token:
            return
        token_hash = hash_refresh_token(raw_refresh_token)
        stored_token = await self.refresh_token_repo.get_by_hash(token_hash)
        if stored_token and not stored_token.is_revoked:
            await self.refresh_token_repo.revoke(stored_token.id)

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        return await self.user_repo.get_by_id(user_id)

    async def bootstrap_admin_user(self, email: str, password: str, full_name: str = "Practice Administrator") -> User:
        """
        Creates or updates the initial administrator account.
        Used strictly by safe local bootstrap commands.
        """
        existing = await self.user_repo.get_by_email(email)
        hashed = hash_password(password)
        if existing:
            existing.hashed_password = hashed
            existing.full_name = full_name
            existing.role = UserRole.ADMIN
            existing.is_active = True
            existing.updated_at = datetime.now(timezone.utc)
            return await self.user_repo.save(existing)
        else:
            admin_user = User(
                email=email.strip().lower(),
                hashed_password=hashed,
                full_name=full_name,
                role=UserRole.ADMIN,
                is_active=True,
            )
            return await self.user_repo.save(admin_user)
