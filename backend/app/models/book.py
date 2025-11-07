"""Book database models."""
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from .base import Base, TimestampMixin


class Book(Base, TimestampMixin):
    """Book model - stores EPUB metadata and file location."""
    
    __tablename__ = "books"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Basic metadata
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    author: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    publisher: Mapped[Optional[str]] = mapped_column(String(500))
    
    # File information
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    
    # Cover image (stored as base64 or file path)
    cover_image: Mapped[Optional[str]] = mapped_column(Text)
    
    # Reading progress
    current_cfi: Mapped[Optional[str]] = mapped_column(String(500))
    current_chapter: Mapped[Optional[int]] = mapped_column(Integer)
    percentage: Mapped[Optional[float]] = mapped_column(Float)  # Stored as 0-1 decimal (0.0 = 0%, 1.0 = 100%)
    location_index: Mapped[Optional[int]] = mapped_column(Integer)  # Backup numeric location (from book.locations)
    last_read_date: Mapped[Optional[datetime]] = mapped_column(index=True)
    
    # Cached location data for fast percentage calculation (JSON serialized)
    locations_data: Mapped[Optional[str]] = mapped_column(Text)
    
    # Extended metadata (JSON-like fields)
    isbn: Mapped[Optional[str]] = mapped_column(String(20))
    language: Mapped[Optional[str]] = mapped_column(String(10))
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Import tracking
    import_date: Mapped[datetime] = mapped_column(nullable=False, index=True)
    
    def __repr__(self) -> str:
        return f"<Book(id={self.id}, title='{self.title}', author='{self.author}')>"
