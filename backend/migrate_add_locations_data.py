"""Migration script to add locations_data column to books table."""
import asyncio
import sqlite3
from pathlib import Path


async def migrate():
    """Add locations_data column if it doesn't exist."""
    # Find the database file
    db_path = Path(__file__).parent / "vibes.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        print("ℹ️  Database will be created with the column on first run.")
        return
    
    print(f"📚 Migrating database at {db_path}")
    
    # Connect to SQLite database
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(books)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'locations_data' in columns:
            print("✓ locations_data column already exists")
        else:
            print("Adding locations_data column...")
            cursor.execute("""
                ALTER TABLE books 
                ADD COLUMN locations_data TEXT
            """)
            conn.commit()
            print("✓ locations_data column added successfully")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()
    
    print("✓ Migration complete")


if __name__ == "__main__":
    asyncio.run(migrate())
