import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_health_endpoint_healthy(async_client):
    with patch("app.api.v1.endpoints.health.check_database_health", return_value=True):
        response = await async_client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data == {
            "status": "healthy",
            "database": "connected",
        }


@pytest.mark.asyncio
async def test_health_endpoint_degraded(async_client):
    with patch("app.api.v1.endpoints.health.check_database_health", return_value=False):
        response = await async_client.get("/api/v1/health")
        assert response.status_code == 503
        data = response.json()
        assert data == {
            "status": "degraded",
            "database": "disconnected",
        }
        # Check that no sensitive strings or stack traces are present
        assert "password" not in response.text.lower()
        assert "traceback" not in response.text.lower()
