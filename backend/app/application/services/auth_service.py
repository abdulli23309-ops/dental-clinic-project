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
from app.domain.models.user import RefreshToken, User, UserRole, UserSession
from app.domain.repositories.user_repo import (
    RefreshTokenRepository,
    UserRepository,
    UserSessionRepository,
)


class AuthService:
    """
    Handles authentication workflows including credential validation,
    session lifecycle, JWT issuance, 35-minute refresh token rotation,
    and server-side revocation.
    """

    def __init__(
        self,
        user_repo: UserRepository,
        refresh_token_repo: RefreshTokenRepository,
        session_repo: UserSessionRepository,
    ):
        self.user_repo = user_repo
        self.refresh_token_repo = refresh_token_repo
        self.session_repo = session_repo

    async def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str, User]:
        """
        Validates login credentials. On success, creates a tracked user session,
        issues a 7-day access token, and issues a 7-day secure refresh token.
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

        now = datetime.now(timezone.utc)
        session_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        # Strict Single Session ("One PC at a time"):
        # Query and revoke/invalidate ALL existing active sessions and refresh tokens for this user
        await self.session_repo.revoke_all_for_user(user.id)
        await self.refresh_token_repo.revoke_all_for_user(user.id)

        # 1. Create and persist user session
        session = UserSession(
            user_id=user.id,
            expires_at=session_expires,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        saved_session = await self.session_repo.save(session)

        # 2. Issue 7-day access token with session_id claim
        access_token = create_access_token(
            subject=str(user.id),
            role=user.role.value,
            session_id=str(saved_session.id),
        )

        # 3. Issue and persist 7-day refresh token linked to session
        raw_refresh_token = generate_refresh_token()
        token_hash = hash_refresh_token(raw_refresh_token)
        refresh_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_record = RefreshToken(
            user_id=user.id,
            session_id=saved_session.id,
            token_hash=token_hash,
            expires_at=refresh_expires,
        )
        await self.refresh_token_repo.save(refresh_record)

        return access_token, raw_refresh_token, user

    async def rotate_refresh_token(
        self,
        raw_refresh_token: str,
    ) -> Tuple[str, str, User, bool]:
        """
        Refreshes access credentials.
        - Tolerates concurrent requests within CONCURRENCY_GRACE_PERIOD_SECONDS without revoking sessions.
        - Rotates the refresh token only if >= REFRESH_TOKEN_ROTATE_AFTER_MINUTES (35m) have elapsed.
        - Returns (access_token, refresh_token, user, did_rotate).
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

        now = datetime.now(timezone.utc)

        # Detect reuse of revoked token (with concurrency grace period tolerance)
        if stored_token.is_revoked:
            revoked_at = stored_token.revoked_at
            if revoked_at and revoked_at.tzinfo is None:
                revoked_at = revoked_at.replace(tzinfo=timezone.utc)

            # If revoked within the grace period (legitimate parallel browser requests), tolerate
            is_recent = revoked_at and (now - revoked_at).total_seconds() <= settings.CONCURRENCY_GRACE_PERIOD_SECONDS
            if is_recent and stored_token.replaced_by:
                replacement_token = await self.refresh_token_repo.get_by_id(stored_token.replaced_by)
                user = await self.user_repo.get_by_id(stored_token.user_id)
                session = await self.session_repo.get_by_id(stored_token.session_id) if stored_token.session_id else None
                if user and user.is_active and (session is None or session.is_active):
                    access_token = create_access_token(
                        subject=str(user.id),
                        role=user.role.value,
                        session_id=str(session.id) if session else None,
                    )
                    # Return new access token without re-rotating or revoking
                    return access_token, raw_refresh_token, user, False

            # Genuine replay / reuse attack: revoke all user sessions defensively
            await self.refresh_token_repo.revoke_all_for_user(stored_token.user_id)
            await self.session_repo.revoke_all_for_user(stored_token.user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked.",
            )

        # Check expiration
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

        # Verify session is still active
        session = None
        if stored_token.session_id:
            session = await self.session_repo.get_by_id(stored_token.session_id)
            if not session or not session.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication session has been revoked or expired.",
                )

        # Check if 35-minute rotation threshold has been reached
        created_at = stored_token.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        token_age_minutes = (now - created_at).total_seconds() / 60.0

        if token_age_minutes < settings.REFRESH_TOKEN_ROTATE_AFTER_MINUTES:
            # Token is within 35-minute window: issue new access token, retain current refresh token
            access_token = create_access_token(
                subject=str(user.id),
                role=user.role.value,
                session_id=str(session.id) if session else None,
            )
            return access_token, raw_refresh_token, user, False

        # Token is >= 35 minutes old: rotate refresh token
        new_raw_token = generate_refresh_token()
        new_hash = hash_refresh_token(new_raw_token)
        new_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_record = RefreshToken(
            user_id=user.id,
            session_id=session.id if session else None,
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
            session_id=str(session.id) if session else None,
        )

        return new_access_token, new_raw_token, user, True

    async def logout(self, raw_refresh_token: Optional[str]) -> None:
        """Revokes the active refresh token and terminates the associated session."""
        if not raw_refresh_token:
            return
        token_hash = hash_refresh_token(raw_refresh_token)
        stored_token = await self.refresh_token_repo.get_by_hash(token_hash)
        if stored_token:
            if not stored_token.is_revoked:
                await self.refresh_token_repo.revoke(stored_token.id)
            if stored_token.session_id:
                await self.session_repo.revoke(stored_token.session_id)

    async def validate_session(self, session_id: UUID) -> bool:
        """Verifies whether a user session remains active on the server."""
        session = await self.session_repo.get_by_id(session_id)
        if not session or not session.is_active:
            return False
        now = datetime.now(timezone.utc)
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return expires_at > now

    async def update_inactivity_settings(
        self,
        user_id: UUID,
        enabled: bool,
        timeout_minutes: int,
        warning_seconds: int,
    ) -> User:
        """Updates user inactivity timeout configuration."""
        updated = await self.user_repo.update_inactivity_settings(
            user_id=user_id,
            inactivity_enabled=enabled,
            inactivity_timeout_minutes=timeout_minutes,
            inactivity_warning_seconds=warning_seconds,
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )
        return updated

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        return await self.user_repo.get_by_id(user_id)

    async def bootstrap_admin_user(
        self,
        email: str,
        password: str,
        full_name: str = "Practice Administrator",
    ) -> User:
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
