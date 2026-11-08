import os
import secrets
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env file relative to project root (three directories up from this module)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """
    Loads and holds configuration settings for the backend application.

    Values are read from environment variables or a local .env file, controlling settings
    like database connection addresses, allowed website origins, authentication, and file storage.
    """
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    APP_NAME: str = "Hira Dental Clinic API"
    API_V1_PREFIX: str = "/api/v1"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return bool(v)
        if isinstance(v, str):
            normalized = v.strip().lower()
            if normalized in ("true", "1", "yes", "y", "t", "enable", "enabled", "on", "debug", "dev", "development"):
                return True
            return False
        return False

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/dentai_dev"
    APPOINTMENTS_RATE_LIMIT: str = "5/minute"
    PUBLIC_LEADS_RATE_LIMIT: str = "30/minute"
    PUBLIC_BOOKING_RATE_LIMIT: str = "60/minute"

    # Authentication & Security
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7 * 24 * 60  # 7 days (10,080 minutes)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days
    REFRESH_TOKEN_ROTATE_AFTER_MINUTES: int = 35  # 35 minutes rotation window
    REFRESH_COOKIE_NAME: str = "marlow_refresh_token"
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Optional[str] = None
    LOGIN_RATE_LIMIT: str = "5/minute"
    REFRESH_RATE_LIMIT: str = "30/minute"
    CONCURRENCY_GRACE_PERIOD_SECONDS: int = 30

    # Storage & Attachments
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB
    ATTACHMENT_DIR: str = os.getenv(
        "ATTACHMENT_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "attachments")),
    )
    ATTACHMENT_MAX_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB

    # Messaging & Reminders Scheduler
    SCHEDULER_ENABLED: bool = False
    SCHEDULER_INTERVAL_SECONDS: int = 60

    # Clinical Depth Flags
    CLINICAL_DOCUMENTS_ENABLED: bool = True

    @model_validator(mode="after")
    def verify_production_safety(self) -> "Settings":
        env_name = (self.ENVIRONMENT or "").strip().lower()
        insecure_markers = ["dev-marlow", "change-in-production", "default", "insecure", "example", "placeholder"]

        if not self.JWT_SECRET_KEY or not str(self.JWT_SECRET_KEY).strip():
            if env_name in {"development", "test"}:
                self.JWT_SECRET_KEY = secrets.token_urlsafe(32)
                return self
            raise ValueError("Startup refused: JWT_SECRET_KEY is required for this environment.")

        secret_value = str(self.JWT_SECRET_KEY).strip()
        if env_name in {"development", "test"}:
            if any(marker in secret_value.lower() for marker in insecure_markers):
                raise ValueError(
                    "Startup refused: insecure JWT secret value is not allowed in local or test environments. "
                    "Set JWT_SECRET_KEY to a strong per-environment value or let the app generate one for local development."
                )
            return self

        if len(secret_value) < 32 or any(marker in secret_value.lower() for marker in ["change-in-production", "dev-marlow-dental"]):
            raise ValueError(
                "Production startup refused: JWT_SECRET_KEY is unset or using the default development secret."
            )

        # Production cookies must only be sent over HTTPS and must not be accessible to
        # client-side script. A non-secure cookie in production would expose the refresh
        # token (and thus the session) to interception.
        if not self.COOKIE_SECURE:
            raise ValueError(
                "Production startup refused: COOKIE_SECURE must be true in production."
            )
        if self.COOKIE_SAMESITE.lower() not in ("lax", "strict", "none"):
            raise ValueError(
                "Production startup refused: COOKIE_SAMESITE must be lax, strict, or none."
            )
        return self

    @property
    def cors_origins(self) -> List[str]:
        """Converts the comma-separated string of allowed web addresses into a clean Python list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def security_headers(self) -> Dict[str, str]:
        """Returns security headers configured for the deployment environment."""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Cache-Control": "no-store, max-age=0",
            "Pragma": "no-cache",
            "X-Permitted-Cross-Domain-Policies": "none",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://*.googleapis.com https://www.google-analytics.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://*.google-analytics.com https://*.g.doubleclick.net; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "upgrade-insecure-requests;"
            ),
        }

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
