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
    factory = get_session_factory()
    try:
        from sqlalchemy import text
        async with factory() as session:
            await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);"))
            await session.commit()
    except Exception as e:
        logger.warning("Safe schema column check encountered warning: %s", e)

    # Strictly enforce: Database is the single source of truth.
    # If and only if users table is empty (COUNT == 0) on a fresh install, bootstrap one admin account.
    # If COUNT > 0, do ABSOLUTELY NOTHING (0 writes, 0 updates, 0 deletes).
    try:
        from sqlalchemy import text
        from app.core.security import hash_password
        import os
        from uuid import uuid4

        async with factory() as session:
            res = await session.execute(text("SELECT count(*) FROM users;"))
            user_count = res.scalar() or 0
            if user_count == 0:
                admin_email = os.environ.get("INITIAL_ADMIN_EMAIL", "admin@hiradental.com").strip().lower()
                admin_password = os.environ.get("INITIAL_ADMIN_PASSWORD", "Admin123456!")
                admin_name = os.environ.get("INITIAL_ADMIN_NAME", "Administrator")
                await session.execute(
                    text("""
                        INSERT INTO users (id, email, hashed_password, full_name, role, is_active, requires_password_change, has_completed_onboarding)
                        VALUES (:id, :email, :hashed_password, :full_name, 'admin', true, false, true);
                    """),
                    {
                        "id": uuid4(),
                        "email": admin_email,
                        "hashed_password": hash_password(admin_password),
                        "full_name": admin_name,
                    },
                )
                await session.commit()
                logger.info("Initialized bootstrap admin account '%s' on empty database installation (user count was 0).", admin_email)
            else:
                logger.debug("Database has %d existing user(s). 0 bootstrap mutations performed.", user_count)
    except Exception as e:
        logger.warning("Safe bootstrap check encountered warning: %s", e)

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
