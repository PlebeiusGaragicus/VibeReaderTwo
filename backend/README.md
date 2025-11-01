# VibeReader Backend

FastAPI backend for VibeReader - works in both desktop (Electron) and web modes.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

## Development

```bash
# Run in desktop mode (SQLite)
export VIBEREADER_DESKTOP=true
uvicorn app.main:app --reload --port 8000

# Run in web mode (PostgreSQL)
export VIBEREADER_DESKTOP=false
export DATABASE_URL=postgresql://...
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration & environment detection
│   ├── database.py          # Database connection
│   ├── models/              # SQLAlchemy models
│   │   ├── book.py
│   │   ├── annotation.py
│   │   └── settings.py
│   ├── routers/             # API endpoints
│   │   ├── books.py
│   │   ├── annotations.py
│   │   └── settings.py
│   └── services/            # Business logic
│       └── epub_service.py
└── requirements.txt
```

## Desktop Mode

In desktop mode:
- Uses SQLite database at `~/VibeReader/vibereader.db`
- Stores EPUB files at `~/VibeReader/books/`
- Stores cover images at `~/VibeReader/covers/`

## Web Mode

In web mode:
- Uses PostgreSQL database
- File storage TBD (S3/Blossom)
