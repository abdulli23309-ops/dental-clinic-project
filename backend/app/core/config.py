from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Loads and holds configuration settings for the backend application.

    Values are read from environment variables or a local .env file, controlling settings
    like database connection addresses and allowed website origins.
    """
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    APP_NAME: str = "Marlow Dental API"
    API_V1_PREFIX: str = "/api/v1"

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/dentai_dev"
    APPOINTMENTS_RATE_LIMIT: str = "5/minute"

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
