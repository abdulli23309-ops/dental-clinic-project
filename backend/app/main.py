from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.limiter import limiter
from app.core.logging import logger
from app.api.v1.router import api_v1_router
from app.api.v1.endpoints.health import health_check


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the lifecycle of the web server from startup to shutdown.

    When the application starts, it logs a startup message and prepares the database
    connection pool. When the application stops, it cleanly closes all open database connections.
    """
    # Startup
    logger.info("Starting up %s in %s environment", settings.APP_NAME, settings.ENVIRONMENT)
    upload_path = Path(settings.UPLOAD_DIR).resolve()
    upload_path.mkdir(parents=True, exist_ok=True)
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down %s", settings.APP_NAME)
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration: strictly allow configured origins with full HTTP method support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches any unexpected errors that occur while processing an incoming web request.
    Preserves HTTPException and RequestValidationError while masking unhandled crashes.
    """
    if isinstance(exc, (HTTPException, StarletteHTTPException, RequestValidationError)):
        raise exc

    logger.error("Unhandled exception processing request: %s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again or contact the clinic."},
    )


# Mount static uploads directory for local development
upload_dir_path = Path(settings.UPLOAD_DIR).resolve()
upload_dir_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(upload_dir_path)), name="media")

# Mount API V1 routes
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

# Root health check alias
app.add_api_route("/health", health_check, methods=["GET"], tags=["Health"], summary="Root Health Check")
