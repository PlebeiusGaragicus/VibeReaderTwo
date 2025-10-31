"""Annotation database models (highlights, notes, chat contexts)."""
from sqlalchemy import String, Integer, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
import enum
from .base import Base, TimestampMixin


class HighlightColor(str, enum.Enum):
    """Available highlight colors."""
    YELLOW = "yellow"
    GREEN = "green"
    BLUE = "blue"
    PINK = "pink"
    PURPLE = "purple"


class Highlight(Base, TimestampMixin):
    """Highlight model - colored text highlights."""
    
    __tablename__ = "highlights"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # EPUB location
    cfi_range: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    
    # Highlight data
    text: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[HighlightColor] = mapped_column(SQLEnum(HighlightColor), nullable=False, default=HighlightColor.YELLOW)
    
    def __repr__(self) -> str:
        return f"<Highlight(id={self.id}, book_id={self.book_id}, color={self.color})>"


class Note(Base, TimestampMixin):
    """Note model - user annotations with text content."""
    
    __tablename__ = "notes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # EPUB location
    cfi_range: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    
    # Note data
    text: Mapped[str] = mapped_column(Text, nullable=False)  # Selected text
    note_content: Mapped[str] = mapped_column(Text, nullable=False)  # User's note
    
    def __repr__(self) -> str:
        return f"<Note(id={self.id}, book_id={self.book_id})>"


class ChatContext(Base, TimestampMixin):
    """ChatContext model - AI chat conversations about text selections."""
    
    __tablename__ = "chat_contexts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # EPUB location
    cfi_range: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    
    # Chat data
    text: Mapped[str] = mapped_column(Text, nullable=False)  # Selected text
    user_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    ai_response: Mapped[Optional[str]] = mapped_column(Text)
    
    def __repr__(self) -> str:
        return f"<ChatContext(id={self.id}, book_id={self.book_id})>"
