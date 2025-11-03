"""Settings API endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from ..database import get_db
from ..models import UserSettings, Theme, PageMode

router = APIRouter(prefix="/api/settings", tags=["settings"])


# Pydantic schemas
class SettingsResponse(BaseModel):
    id: int
    font_size: int
    font_family: str
    line_height: float
    theme: Theme
    page_mode: PageMode
    api_base_url: Optional[str]
    api_model_name: Optional[str]
    api_key: Optional[str]
    
    class Config:
        from_attributes = True


class ReadingSettingsUpdate(BaseModel):
    font_size: Optional[int] = None
    font_family: Optional[str] = None
    line_height: Optional[float] = None
    theme: Optional[Theme] = None
    page_mode: Optional[PageMode] = None


class ApiSettingsUpdate(BaseModel):
    api_base_url: Optional[str] = None
    api_model_name: Optional[str] = None
    api_key: Optional[str] = None


@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get user settings (creates default if none exist)."""
    result = await db.execute(select(UserSettings))
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create default settings
        settings = UserSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return settings


@router.patch("/reading", response_model=SettingsResponse)
async def update_reading_settings(
    update: ReadingSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update reading settings."""
    result = await db.execute(select(UserSettings))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings()
        db.add(settings)
    
    # Update fields
    if update.font_size is not None:
        settings.font_size = update.font_size
    if update.font_family is not None:
        settings.font_family = update.font_family
    if update.line_height is not None:
        settings.line_height = update.line_height
    if update.theme is not None:
        settings.theme = update.theme
    if update.page_mode is not None:
        settings.page_mode = update.page_mode
    
    await db.commit()
    await db.refresh(settings)
    return settings


@router.patch("/api", response_model=SettingsResponse)
async def update_api_settings(
    update: ApiSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update API settings."""
    result = await db.execute(select(UserSettings))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings()
        db.add(settings)
    
    # Update fields
    if update.api_base_url is not None:
        settings.api_base_url = update.api_base_url
    if update.api_model_name is not None:
        settings.api_model_name = update.api_model_name
    if update.api_key is not None:
        settings.api_key = update.api_key
    
    await db.commit()
    await db.refresh(settings)
    return settings
