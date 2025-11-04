#!/usr/bin/env python3
"""
Migration script to add new display settings columns to existing settings table.
Run this if you have an existing database that needs the new columns.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.database import engine


async def migrate():
    """Add new display settings columns to the settings table."""
    async with engine.begin() as conn:
        print("Running migration to add display settings columns...")
        
        # Check if columns already exist
        result = await conn.execute(text("PRAGMA table_info(settings)"))
        columns = {row[1] for row in result}
        
        migrations = []
        
        if 'text_align' not in columns:
            migrations.append("ALTER TABLE settings ADD COLUMN text_align VARCHAR(10) NOT NULL DEFAULT 'left'")
        
        if 'margin_size' not in columns:
            migrations.append("ALTER TABLE settings ADD COLUMN margin_size VARCHAR(10) NOT NULL DEFAULT 'normal'")
        
        if 'letter_spacing' not in columns:
            migrations.append("ALTER TABLE settings ADD COLUMN letter_spacing FLOAT NOT NULL DEFAULT 0.0")
        
        if 'paragraph_spacing' not in columns:
            migrations.append("ALTER TABLE settings ADD COLUMN paragraph_spacing FLOAT NOT NULL DEFAULT 1.0")
        
        if 'word_spacing' not in columns:
            migrations.append("ALTER TABLE settings ADD COLUMN word_spacing FLOAT NOT NULL DEFAULT 0.0")
        
        if 'hyphenation' not in columns:
            migrations.append("ALTER TABLE settings ADD COLUMN hyphenation VARCHAR(10) NOT NULL DEFAULT 'none'")
        
        if not migrations:
            print("✓ All columns already exist. No migration needed.")
            return
        
        # Execute migrations
        for migration in migrations:
            print(f"  Running: {migration}")
            await conn.execute(text(migration))
        
        print(f"✓ Migration complete! Added {len(migrations)} columns.")


if __name__ == "__main__":
    asyncio.run(migrate())
