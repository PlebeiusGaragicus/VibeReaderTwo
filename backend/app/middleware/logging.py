"""Enhanced logging middleware for debugging."""
import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
from logging.handlers import RotatingFileHandler

# Logger instance
logger = logging.getLogger("vibereader")


def configure_logging(debug_mode: bool = False, log_file_path: str = None):
    """Configure logging with optional file output."""
    # Set log level
    level = logging.DEBUG if debug_mode else logging.INFO
    logger.setLevel(level)
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler (if debug mode and log file path provided)
    if debug_mode and log_file_path:
        file_handler = RotatingFileHandler(
            log_file_path,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=3,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        logger.info(f"📝 File logging enabled: {log_file_path}")
    
    # Prevent propagation to root logger
    logger.propagate = False


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
    
    # Configure logging based on settings
    configure_logging(
        debug_mode=settings.debug_mode,
        log_file_path=str(settings.log_file_path) if settings.debug_mode else None
    )
    
    logger.info("=" * 60)
    logger.info("VibeReader Backend Starting")
    logger.info("=" * 60)
    logger.info(f"Mode: {'Desktop' if settings.is_desktop else 'Web'}")
    logger.info(f"Debug Mode: {'Enabled' if settings.debug_mode else 'Disabled'}")
    logger.info(f"Database: {settings.database_url}")
    
    if settings.is_desktop:
        logger.info(f"Data Directory: {settings.user_data_dir}")
        logger.info(f"Books Directory: {settings.books_dir}")
        logger.info(f"Database Path: {settings.db_path}")
        if settings.debug_mode:
            logger.info(f"Log File: {settings.log_file_path}")
    
    logger.info("=" * 60)
