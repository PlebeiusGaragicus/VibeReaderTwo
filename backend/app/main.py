"""FastAPI main application."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .config import settings, init_desktop_directories
from .database import init_db
from .routers import books, annotations, settings as settings_router
from .middleware.logging import RequestLoggingMiddleware, log_startup_info

logger = logging.getLogger("vibereader")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    log_startup_info()
    
    if settings.is_desktop:
        init_desktop_directories()
    
    await init_db()
    logger.info("✓ Database initialized")
    logger.info("✓ API Ready!")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="VibeReader API",
    description="EPUB reader with annotations and AI features",
    version="2.0.0",
    lifespan=lifespan,
)

# Add logging middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(books.router)
app.include_router(annotations.router)
app.include_router(settings_router.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "VibeReader API",
        "version": "2.0.0",
        "mode": "desktop" if settings.is_desktop else "web",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
