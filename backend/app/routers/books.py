"""Books API endpoints."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
import logging

from ..database import get_db
from ..models import Book
from ..services.epub_service import EpubService

router = APIRouter(prefix="/api/books", tags=["books"])
epub_service = EpubService()
logger = logging.getLogger("vibereader.books")


# Pydantic schemas
class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    publisher: Optional[str]
    cover_image: Optional[str]
    file_size: int
    file_hash: str
    current_cfi: Optional[str]
    current_chapter: Optional[int]
    percentage: Optional[float]
    last_read_date: Optional[datetime]
    isbn: Optional[str]
    language: Optional[str]
    description: Optional[str]
    import_date: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProgressUpdate(BaseModel):
    current_cfi: Optional[str] = None
    current_chapter: Optional[int] = None
    percentage: Optional[float] = None


@router.post("/import", response_model=BookResponse)
async def import_book(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Import an EPUB file."""
    
    # Validate file type
    if not file.filename.endswith('.epub'):
        raise HTTPException(status_code=400, detail="Only EPUB files are supported")
    
    try:
        # Read file content
        content = await file.read()
        await file.seek(0)  # Reset for reuse
        
        # Calculate hash for duplicate detection
        file_hash = await epub_service.calculate_file_hash(content)
        
        # Check for duplicates
        result = await db.execute(
            select(Book).where(Book.file_hash == file_hash)
        )
        existing_book = result.scalar_one_or_none()
        
        if existing_book:
            raise HTTPException(
                status_code=409,
                detail=f"This book is already in your library: '{existing_book.title}' by {existing_book.author}"
            )
        
        # Save file to storage
        file_path = await epub_service.save_epub_file(file, file_hash)
        
        # Extract metadata
        metadata = await epub_service.extract_metadata(file_path)
        
        # Extract cover
        cover_image = await epub_service.extract_cover(file_path)
        
        # Create book record
        book = Book(
            title=metadata["title"],
            author=metadata["author"],
            publisher=metadata["publisher"],
            file_path=str(file_path),
            file_size=len(content),
            file_hash=file_hash,
            cover_image=cover_image,
            isbn=metadata["isbn"],
            language=metadata["language"],
            description=metadata["description"],
            import_date=datetime.utcnow(),
        )
        
        db.add(book)
        await db.commit()
        await db.refresh(book)
        
        return book
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error importing book: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to import book: {str(e)}")


@router.get("", response_model=List[BookResponse])
async def get_books(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all books in library."""
    result = await db.execute(
        select(Book)
        .order_by(Book.import_date.desc())
        .offset(skip)
        .limit(limit)
    )
    books = result.scalars().all()
    return books


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific book by ID."""
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    return book


@router.get("/{book_id}/file")
async def get_book_file(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get the EPUB file for a book."""
    logger.info(f"📖 Fetching EPUB file for book_id={book_id}")
    
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        logger.warning(f"❌ Book not found: book_id={book_id}")
        raise HTTPException(status_code=404, detail="Book not found")
    
    logger.info(f"📚 Found book: '{book.title}' by {book.author}")
    logger.info(f"📁 File path: {book.file_path}")
    
    try:
        file_content = await epub_service.get_epub_file(book.file_path)
        file_size_mb = len(file_content) / (1024 * 1024)
        logger.info(f"✓ Serving EPUB file: {file_size_mb:.2f}MB")
        
        from fastapi.responses import Response
        return Response(
            content=file_content,
            media_type="application/epub+zip",
            headers={
                "Content-Disposition": f'attachment; filename="{book.title}.epub"'
            }
        )
    except FileNotFoundError as e:
        logger.error(f"❌ EPUB file not found: {book.file_path}")
        raise HTTPException(status_code=404, detail="EPUB file not found")
    except Exception as e:
        logger.error(f"❌ Error retrieving file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve file: {str(e)}")


@router.patch("/{book_id}/progress", response_model=BookResponse)
async def update_progress(
    book_id: int,
    progress: ProgressUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update reading progress for a book."""
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Update fields
    if progress.current_cfi is not None:
        book.current_cfi = progress.current_cfi
    if progress.current_chapter is not None:
        book.current_chapter = progress.current_chapter
    if progress.percentage is not None:
        book.percentage = progress.percentage
    
    book.last_read_date = datetime.utcnow()
    
    await db.commit()
    await db.refresh(book)
    
    return book


@router.delete("/{book_id}")
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a book from library."""
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Delete file from storage
    try:
        from pathlib import Path
        file_path = Path(book.file_path)
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"Warning: Could not delete file: {e}")
    
    # Delete from database (cascade will handle annotations)
    await db.delete(book)
    await db.commit()
    
    return {"message": "Book deleted successfully"}
