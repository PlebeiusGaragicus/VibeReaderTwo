"""EPUB file processing service."""
import hashlib
import base64
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import UploadFile
import ebooklib
from ebooklib import epub
from PIL import Image
from io import BytesIO
from ..config import settings


class EpubService:
    """Service for processing EPUB files."""
    
    @staticmethod
    async def calculate_file_hash(file_content: bytes) -> str:
        """Calculate SHA256 hash of file content."""
        return hashlib.sha256(file_content).hexdigest()
    
    @staticmethod
    async def extract_metadata(file_path: Path) -> Dict[str, Any]:
        """Extract metadata from EPUB file."""
        try:
            book = epub.read_epub(str(file_path))
            
            # Extract basic metadata
            title = book.get_metadata('DC', 'title')
            title = title[0][0] if title else "Unknown Title"
            
            author = book.get_metadata('DC', 'creator')
            author = author[0][0] if author else "Unknown Author"
            
            publisher = book.get_metadata('DC', 'publisher')
            publisher = publisher[0][0] if publisher else None
            
            language = book.get_metadata('DC', 'language')
            language = language[0][0] if language else None
            
            description = book.get_metadata('DC', 'description')
            description = description[0][0] if description else None
            
            # Try to get ISBN
            isbn = book.get_metadata('DC', 'identifier')
            isbn_value = None
            if isbn:
                for identifier in isbn:
                    if 'ISBN' in str(identifier).upper():
                        isbn_value = identifier[0]
                        break
            
            return {
                "title": title,
                "author": author,
                "publisher": publisher,
                "language": language,
                "description": description,
                "isbn": isbn_value,
            }
        except Exception as e:
            print(f"Error extracting metadata: {e}")
            return {
                "title": "Unknown Title",
                "author": "Unknown Author",
                "publisher": None,
                "language": None,
                "description": None,
                "isbn": None,
            }
    
    @staticmethod
    async def extract_cover(file_path: Path) -> Optional[str]:
        """Extract cover image from EPUB and return as base64."""
        try:
            book = epub.read_epub(str(file_path))
            
            # Try to find cover image
            cover_image = None
            
            # Method 1: Look for cover in metadata
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_COVER:
                    cover_image = item.get_content()
                    break
            
            # Method 2: Look for cover in manifest
            if not cover_image:
                for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
                    if 'cover' in item.get_name().lower():
                        cover_image = item.get_content()
                        break
            
            # Method 3: Use first image
            if not cover_image:
                images = list(book.get_items_of_type(ebooklib.ITEM_IMAGE))
                if images:
                    cover_image = images[0].get_content()
            
            if cover_image:
                # Convert to base64
                image = Image.open(BytesIO(cover_image))
                
                # Resize if too large
                max_size = (400, 600)
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Convert to base64
                buffered = BytesIO()
                image.save(buffered, format="JPEG", quality=85)
                img_str = base64.b64encode(buffered.getvalue()).decode()
                
                return f"data:image/jpeg;base64,{img_str}"
            
            return None
        except Exception as e:
            print(f"Error extracting cover: {e}")
            return None
    
    @staticmethod
    async def save_epub_file(file: UploadFile, file_hash: str) -> Path:
        """Save EPUB file to local storage."""
        if not settings.is_desktop:
            raise NotImplementedError("Cloud storage not yet implemented")
        
        # Ensure books directory exists
        settings.books_dir.mkdir(parents=True, exist_ok=True)
        
        # Save with hash as filename
        file_path = settings.books_dir / f"{file_hash}.epub"
        
        # Write file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        return file_path
    
    @staticmethod
    async def get_epub_file(file_path: str) -> bytes:
        """Read EPUB file from storage."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"EPUB file not found: {file_path}")
        
        with open(path, "rb") as f:
            return f.read()
