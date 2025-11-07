#!/usr/bin/env python3
"""
Migration script to add location_index column to books table
This adds a backup numeric location field for progress tracking
"""
import asyncio
import sqlite3
from pathlib import Path

async def main():
    # Get the database path
    db_path = Path(__file__).parent.parent / 'vibereader.db'
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        print("This is expected if you haven't run the app yet.")
        return
    
    print(f"Migrating database at: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(books)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'location_index' in columns:
            print("✓ Column 'location_index' already exists")
        else:
            print("Adding 'location_index' column...")
            cursor.execute("""
                ALTER TABLE books 
                ADD COLUMN location_index INTEGER
            """)
            conn.commit()
            print("✓ Successfully added 'location_index' column")
        
        print("\nMigration complete!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(main())
