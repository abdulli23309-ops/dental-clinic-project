from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Loads and holds configuration settings for the backend application.

    Values are read from environment variables or a local .env file, controlling settings
    like database connection addresses, allowed website origins, authentication, and file storage.
    """
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    APP_NAME: str = "Marlow Dental API"
    API_V1_PREFIX: str = "/api/v1"

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/dentai_dev"
    APPOINTMENTS_RATE_LIMIT: str = "5/minute"

    # Authentication & Security
    JWT_SECRET_KEY: str = "dev-marlow-dental-insecure-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7 * 24 * 60  # 7 days (10,080 minutes)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days
    REFRESH_TOKEN_ROTATE_AFTER_MINUTES: int = 35  # 35 minutes rotation window
    REFRESH_COOKIE_NAME: str = "marlow_refresh_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Optional[str] = None
    LOGIN_RATE_LIMIT: str = "5/minute"
    REFRESH_RATE_LIMIT: str = "30/minute"
    CONCURRENCY_GRACE_PERIOD_SECONDS: int = 30

    # Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB

    @property
    def cors_origins(self) -> List[str]:
        """Converts the comma-separated string of allowed web addresses into a clean Python list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
