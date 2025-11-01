"""Annotations API endpoints (highlights, notes, chat contexts)."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from ..database import get_db
from ..models import Highlight, Note, ChatContext, HighlightColor

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


# Pydantic schemas
class HighlightCreate(BaseModel):
    book_id: int
    cfi_range: str
    text: str
    color: HighlightColor = HighlightColor.YELLOW


class HighlightResponse(BaseModel):
    id: int
    book_id: int
    cfi_range: str
    text: str
    color: HighlightColor
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class HighlightUpdate(BaseModel):
    color: HighlightColor


class NoteCreate(BaseModel):
    book_id: int
    cfi_range: str
    text: str
    note_content: str


class NoteResponse(BaseModel):
    id: int
    book_id: int
    cfi_range: str
    text: str
    note_content: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class NoteUpdate(BaseModel):
    note_content: str


class ChatContextCreate(BaseModel):
    book_id: int
    cfi_range: str
    text: str
    user_prompt: str
    ai_response: Optional[str] = None


class ChatContextResponse(BaseModel):
    id: int
    book_id: int
    cfi_range: str
    text: str
    user_prompt: str
    ai_response: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChatContextUpdate(BaseModel):
    ai_response: str


# Highlights endpoints
@router.post("/highlights", response_model=HighlightResponse)
async def create_highlight(
    highlight: HighlightCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new highlight."""
    db_highlight = Highlight(**highlight.model_dump())
    db.add(db_highlight)
    await db.commit()
    await db.refresh(db_highlight)
    return db_highlight


@router.get("/highlights/book/{book_id}", response_model=List[HighlightResponse])
async def get_highlights(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all highlights for a book."""
    result = await db.execute(
        select(Highlight)
        .where(Highlight.book_id == book_id)
        .order_by(Highlight.created_at)
    )
    highlights = result.scalars().all()
    return highlights


@router.patch("/highlights/{highlight_id}", response_model=HighlightResponse)
async def update_highlight(
    highlight_id: int,
    update: HighlightUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update highlight color."""
    result = await db.execute(
        select(Highlight).where(Highlight.id == highlight_id)
    )
    highlight = result.scalar_one_or_none()
    
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    highlight.color = update.color
    await db.commit()
    await db.refresh(highlight)
    return highlight


@router.delete("/highlights/{highlight_id}")
async def delete_highlight(
    highlight_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a highlight."""
    result = await db.execute(
        select(Highlight).where(Highlight.id == highlight_id)
    )
    highlight = result.scalar_one_or_none()
    
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    await db.delete(highlight)
    await db.commit()
    return {"message": "Highlight deleted"}


# Notes endpoints
@router.post("/notes", response_model=NoteResponse)
async def create_note(
    note: NoteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new note."""
    db_note = Note(**note.model_dump())
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note


@router.get("/notes/book/{book_id}", response_model=List[NoteResponse])
async def get_notes(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all notes for a book."""
    result = await db.execute(
        select(Note)
        .where(Note.book_id == book_id)
        .order_by(Note.created_at)
    )
    notes = result.scalars().all()
    return notes


@router.get("/notes/range/{book_id}", response_model=Optional[NoteResponse])
async def get_note_by_range(
    book_id: int,
    cfi_range: str,
    db: AsyncSession = Depends(get_db)
):
    """Get note by CFI range (cfi_range as query parameter)."""
    result = await db.execute(
        select(Note).where(
            and_(Note.book_id == book_id, Note.cfi_range == cfi_range)
        )
    )
    note = result.scalar_one_or_none()
    return note


@router.patch("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    update: NoteUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update note content."""
    result = await db.execute(
        select(Note).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.note_content = update.note_content
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a note."""
    result = await db.execute(
        select(Note).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    await db.delete(note)
    await db.commit()
    return {"message": "Note deleted"}


# Chat contexts endpoints
@router.post("/chat-contexts", response_model=ChatContextResponse)
async def create_chat_context(
    chat: ChatContextCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat context."""
    db_chat = ChatContext(**chat.model_dump())
    db.add(db_chat)
    await db.commit()
    await db.refresh(db_chat)
    return db_chat


@router.get("/chat-contexts/book/{book_id}", response_model=List[ChatContextResponse])
async def get_chat_contexts(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all chat contexts for a book."""
    result = await db.execute(
        select(ChatContext)
        .where(ChatContext.book_id == book_id)
        .order_by(ChatContext.created_at)
    )
    chats = result.scalars().all()
    return chats


@router.get("/chat-contexts/range/{book_id}", response_model=List[ChatContextResponse])
async def get_chat_contexts_by_range(
    book_id: int,
    cfi_range: str,
    db: AsyncSession = Depends(get_db)
):
    """Get chat contexts by CFI range (cfi_range as query parameter)."""
    result = await db.execute(
        select(ChatContext).where(
            and_(ChatContext.book_id == book_id, ChatContext.cfi_range == cfi_range)
        )
    )
    chats = result.scalars().all()
    return chats


@router.patch("/chat-contexts/{chat_id}", response_model=ChatContextResponse)
async def update_chat_context(
    chat_id: int,
    update: ChatContextUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update chat context with AI response."""
    result = await db.execute(
        select(ChatContext).where(ChatContext.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat context not found")
    
    chat.ai_response = update.ai_response
    await db.commit()
    await db.refresh(chat)
    return chat


@router.delete("/chat-contexts/{chat_id}")
async def delete_chat_context(
    chat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat context."""
    result = await db.execute(
        select(ChatContext).where(ChatContext.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat context not found")
    
    await db.delete(chat)
    await db.commit()
    return {"message": "Chat context deleted"}
