"""Settings database model."""
from sqlalchemy import String, Integer, Float, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
import enum
from .base import Base, TimestampMixin


class Theme(str, enum.Enum):
    """Available reading themes."""
    LIGHT = "light"
    DARK = "dark"
    SEPIA = "sepia"


class PageMode(str, enum.Enum):
    """Reading page modes."""
    PAGINATED = "paginated"
    SCROLL = "scroll"


class UserSettings(Base, TimestampMixin):
    """User settings model - stores application preferences."""
    
    __tablename__ = "settings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Reading settings
    font_size: Mapped[int] = mapped_column(Integer, nullable=False, default=16)
    font_family: Mapped[str] = mapped_column(String(100), nullable=False, default="serif")
    line_height: Mapped[float] = mapped_column(Float, nullable=False, default=1.6)
    theme: Mapped[Theme] = mapped_column(SQLEnum(Theme), nullable=False, default=Theme.LIGHT)
    page_mode: Mapped[PageMode] = mapped_column(SQLEnum(PageMode), nullable=False, default=PageMode.PAGINATED)
    
    # API settings (optional, for future AI features)
    api_base_url: Mapped[Optional[str]] = mapped_column(String(500))
    api_model_name: Mapped[Optional[str]] = mapped_column(String(100))
    api_key: Mapped[Optional[str]] = mapped_column(String(500))
    
    def __repr__(self) -> str:
        return f"<UserSettings(id={self.id}, theme={self.theme}, font_size={self.font_size})>"
