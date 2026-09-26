from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.database import check_database_health

router = APIRouter()


@router.get("/health", summary="Service & Database Health Status")
async def health_check():
    """
    Checks whether the application and its underlying database are running properly.

    It tests the connection to PostgreSQL and returns a 200 OK status if everything is
    operational, or a 503 status if the database cannot be reached.
    """
    is_db_connected = await check_database_health()
    if is_db_connected:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy",
                "database": "connected",
            },
        )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "degraded",
            "database": "disconnected",
        },
    )
