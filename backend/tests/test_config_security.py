import pytest

from app.core.config import Settings


def test_development_generates_a_runtime_secret_when_missing(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    config = Settings()

    assert config.JWT_SECRET_KEY
    assert len(config.JWT_SECRET_KEY) >= 16
    assert "dev-marlow" not in config.JWT_SECRET_KEY.lower()


def test_production_rejects_insecure_default_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv(
        "JWT_SECRET_KEY",
        "dev-marlow-dental-insecure-secret-key-change-in-production-2026",
    )
    monkeypatch.setenv("COOKIE_SECURE", "true")
    monkeypatch.setenv("COOKIE_SAMESITE", "lax")

    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings()


@pytest.mark.asyncio
async def test_storage_service_reports_missing_magic_backend(monkeypatch, tmp_path):
    import app.infrastructure.storage.local_storage as storage_module

    monkeypatch.setattr(storage_module, "magic", None)
    service = storage_module.LocalStorageService(upload_dir=str(tmp_path))

    with pytest.raises(Exception, match="Media validation backend is unavailable"):
        await service.upload(b"%PDF-1.4 test", "sample.pdf", "application/pdf")
