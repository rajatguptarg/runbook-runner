import sys
from loguru import logger


def setup_logging():
    """
    Configure Loguru to output structured JSON logs.
    """
    logger.remove()
    logger.add(
        sys.stdout,
        serialize=True,
        enqueue=True,
        backtrace=True,
        diagnose=True,
        format="{level} {message}",
    )
