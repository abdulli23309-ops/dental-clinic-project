from typing import AsyncGenerator, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings
from app.core.logging import logger

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> AsyncEngine:
    """
    Creates and returns the shared database connection manager.

    It configures connection settings and ensures database queries never print patient data
    into console logs.
    """
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,  # Enforce PHI safety: never echo query parameters
            pool_pre_ping=True,
            future=True,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Creates a factory used to produce individual database sessions for handling requests."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def init_db() -> None:
    """Initializes the database connection pool when the application first starts up."""
    get_engine()
    get_session_factory()
    logger.info("Database engine initialized.")


async def close_db() -> None:
    """Closes all active database connections when the application is shutting down."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("Database engine disposed.")


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a temporary database session for handling a single web request.

    If an error occurs while working with the database, any partial changes are rolled back
    before the session is cleanly closed.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_health() -> bool:
    """
    Tests whether the database is currently responsive by running a quick test query.

    Returns True if the database answers promptly, or False if the connection fails.
    """
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning("Database health check failed.")
        return False
