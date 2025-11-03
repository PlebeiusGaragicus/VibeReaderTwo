"""Application configuration with environment detection."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings with environment-based configuration."""
    
    # Environment detection
    is_desktop: bool = os.getenv("VIBEREADER_DESKTOP", "false").lower() == "true"
    
    # API settings
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    
    # Storage paths (desktop mode)
    user_data_dir: Path = Path.home() / "VibeReader"
    books_dir: Path = user_data_dir / "books"
    covers_dir: Path = user_data_dir / "covers"
    db_path: Path = user_data_dir / "vibereader.db"
    
    # Database URLs
    @property
    def database_url(self) -> str:
        """Get database URL based on environment."""
        if self.is_desktop:
            # Desktop: SQLite
            self.user_data_dir.mkdir(parents=True, exist_ok=True)
            return f"sqlite+aiosqlite:///{self.db_path}"
        else:
            # Web: PostgreSQL (from environment)
            db_url = os.getenv("DATABASE_URL")
            if not db_url:
                raise ValueError("DATABASE_URL must be set for web mode")
            return db_url
    
    # CORS settings
    cors_origins: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
    ]
    
    # API keys (optional, for future features)
    langgraph_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()


def init_desktop_directories():
    """Initialize desktop storage directories."""
    if settings.is_desktop:
        settings.user_data_dir.mkdir(parents=True, exist_ok=True)
        settings.books_dir.mkdir(parents=True, exist_ok=True)
        settings.covers_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ Desktop directories initialized at {settings.user_data_dir}")
