"""Enhanced logging middleware for debugging."""
import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)

logger = logging.getLogger("vibereader")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all HTTP requests with timing and details."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timing
        start_time = time.time()
        
        # Log request
        logger.info(f"→ {request.method} {request.url.path}")
        
        # Log query params if present
        if request.url.query:
            logger.debug(f"  Query: {request.url.query}")
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = (time.time() - start_time) * 1000
            
            # Log response
            status_emoji = "✓" if response.status_code < 400 else "✗"
            logger.info(
                f"{status_emoji} {request.method} {request.url.path} "
                f"→ {response.status_code} ({duration:.0f}ms)"
            )
            
            return response
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(
                f"✗ {request.method} {request.url.path} "
                f"→ ERROR ({duration:.0f}ms): {str(e)}"
            )
            raise


def log_startup_info():
    """Log application startup information."""
    from ..config import settings
    
    logger.info("=" * 60)
    logger.info("VibeReader Backend Starting")
    logger.info("=" * 60)
    logger.info(f"Mode: {'Desktop' if settings.is_desktop else 'Web'}")
    logger.info(f"Database: {settings.database_url}")
    
    if settings.is_desktop:
        logger.info(f"Data Directory: {settings.user_data_dir}")
        logger.info(f"Books Directory: {settings.books_dir}")
        logger.info(f"Database Path: {settings.db_path}")
    
    logger.info("=" * 60)
