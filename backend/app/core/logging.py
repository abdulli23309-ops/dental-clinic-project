import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """
    Sets up the application's central logging system.

    It configures log message formatting and silences chatty database libraries so that
    sensitive patient details are never accidentally written to log files.
    """
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    # Silence verbose 3rd party loggers and ensure SQLAlchemy engine does not log parameters
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    logger = logging.getLogger("marlow_dental")
    logger.setLevel(log_level)
    return logger


logger = setup_logging()
