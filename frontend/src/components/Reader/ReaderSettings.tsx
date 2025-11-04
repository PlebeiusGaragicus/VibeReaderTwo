import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { settingsApiService } from '../../services/settingsApiService';
import { epubService } from '../../services/epubService';
import { resolveTheme } from '../../hooks/useTheme';
import type { Theme, PageMode, TextAlign, MarginSize, Hyphenation } from '../../types';

interface ReaderSettingsProps {
  onSettingsChange: () => void;
  onPageModeChange?: () => void;
}

interface ReaderSettingsState {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: Theme;
  pageMode: PageMode;
  textAlign: TextAlign;
  marginSize: MarginSize;
  letterSpacing: number;
  paragraphSpacing: number;
  wordSpacing: number;
  hyphenation: Hyphenation;
}

const defaultSettings: ReaderSettingsState = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.6,
  theme: 'system',
  pageMode: 'paginated',
  textAlign: 'left',
  marginSize: 'normal',
  letterSpacing: 0,
  paragraphSpacing: 1,
  wordSpacing: 0,
  hyphenation: 'none',
};

export function ReaderSettings({ onSettingsChange, onPageModeChange }: ReaderSettingsProps) {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await settingsApiService.getSettings();
      setSettings({
        fontSize: saved.font_size,
        fontFamily: saved.font_family,
        lineHeight: saved.line_height,
        theme: saved.theme,
        pageMode: saved.page_mode,
        textAlign: saved.text_align,
        marginSize: saved.margin_size,
        letterSpacing: saved.letter_spacing,
        paragraphSpacing: saved.paragraph_spacing,
        wordSpacing: saved.word_spacing,
        hyphenation: saved.hyphenation,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: ReaderSettingsState, skipApply: boolean = false) => {
    try {
      await settingsApiService.updateReadingSettings({
        font_size: newSettings.fontSize,
        font_family: newSettings.fontFamily,
        line_height: newSettings.lineHeight,
        theme: newSettings.theme,
        page_mode: newSettings.pageMode,
        text_align: newSettings.textAlign,
        margin_size: newSettings.marginSize,
        letter_spacing: newSettings.letterSpacing,
        paragraph_spacing: newSettings.paragraphSpacing,
        word_spacing: newSettings.wordSpacing,
        hyphenation: newSettings.hyphenation,
      });
      setSettings(newSettings);
      
      // Skip applying settings if we're about to reload (e.g., page mode change)
      if (skipApply) {
        return;
      }
      
      // Apply theme to document root (for app UI)
      const resolvedTheme = resolveTheme(newSettings.theme);
      const root = document.documentElement;
      root.classList.remove('light', 'dark', 'sepia');
      root.classList.add(resolvedTheme);
      
      // Apply settings to EPUB content
      epubService.applyTheme(newSettings.theme);
      epubService.applyFontSettings({
        fontSize: newSettings.fontSize,
        fontFamily: newSettings.fontFamily,
        lineHeight: newSettings.lineHeight,
      });
      epubService.applyDisplaySettings({
        textAlign: newSettings.textAlign,
        marginSize: newSettings.marginSize,
        letterSpacing: newSettings.letterSpacing,
        paragraphSpacing: newSettings.paragraphSpacing,
        wordSpacing: newSettings.wordSpacing,
        hyphenation: newSettings.hyphenation,
      });
      
      onSettingsChange();
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error; // Re-throw so caller knows save failed
    }
  };

  const updateSetting = async <K extends keyof ReaderSettingsState>(
    key: K,
    value: ReaderSettingsState[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    
    // Page mode changes require reloading the book
    if (key === 'pageMode' && onPageModeChange) {
      try {
        // Save settings but skip applying to current rendition (will be destroyed)
        await saveSettings(newSettings, true);
        // Trigger reload immediately after save completes
        onPageModeChange();
      } catch (error) {
        console.error('Failed to save page mode setting:', error);
      }
    } else {
      // For other settings, save and apply immediately
      saveSettings(newSettings, false);
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto h-[calc(100vh-12rem)]">
        {/* Theme */}
        <div>
          <label className="text-sm font-medium mb-2 block">Theme</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={settings.theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('theme', 'light')}
              className="flex items-center gap-2"
            >
              <Sun className="w-4 h-4" />
              Light
            </Button>
            <Button
              variant={settings.theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('theme', 'dark')}
              className="flex items-center gap-2"
            >
              <Moon className="w-4 h-4" />
              Dark
            </Button>
            <Button
              variant={settings.theme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('theme', 'system')}
              className="flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              System
            </Button>
            <Button
              variant={settings.theme === 'sepia' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('theme', 'sepia')}
            >
              Sepia
            </Button>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Font Size: {settings.fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="32"
            value={settings.fontSize}
            onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Font Family */}
        <div>
          <label className="text-sm font-medium mb-2 block">Font Family</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => updateSetting('fontFamily', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
          >
            <option value="Georgia, serif">Serif</option>
            <option value="Arial, sans-serif">Sans Serif</option>
            <option value="'Courier New', monospace">Monospace</option>
          </select>
        </div>

        {/* Line Height */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Line Height: {settings.lineHeight}
          </label>
          <input
            type="range"
            min="1.2"
            max="2.4"
            step="0.1"
            value={settings.lineHeight}
            onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Text Alignment */}
        <div>
          <label className="text-sm font-medium mb-2 block">Text Alignment</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={settings.textAlign === 'left' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('textAlign', 'left')}
            >
              Left
            </Button>
            <Button
              variant={settings.textAlign === 'justify' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('textAlign', 'justify')}
            >
              Justify
            </Button>
          </div>
        </div>

        {/* Margins */}
        <div>
          <label className="text-sm font-medium mb-2 block">Margins</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={settings.marginSize === 'narrow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('marginSize', 'narrow')}
            >
              Narrow
            </Button>
            <Button
              variant={settings.marginSize === 'normal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('marginSize', 'normal')}
            >
              Normal
            </Button>
            <Button
              variant={settings.marginSize === 'wide' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('marginSize', 'wide')}
            >
              Wide
            </Button>
          </div>
        </div>

        {/* Letter Spacing */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Letter Spacing: {settings.letterSpacing.toFixed(2)}em
          </label>
          <input
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={settings.letterSpacing}
            onChange={(e) => updateSetting('letterSpacing', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Paragraph Spacing */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Paragraph Spacing: {settings.paragraphSpacing.toFixed(1)}em
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={settings.paragraphSpacing}
            onChange={(e) => updateSetting('paragraphSpacing', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Word Spacing */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Word Spacing: {settings.wordSpacing.toFixed(2)}em
          </label>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={settings.wordSpacing}
            onChange={(e) => updateSetting('wordSpacing', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Hyphenation */}
        <div>
          <label className="text-sm font-medium mb-2 block">Hyphenation</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={settings.hyphenation === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('hyphenation', 'none')}
            >
              Off
            </Button>
            <Button
              variant={settings.hyphenation === 'auto' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('hyphenation', 'auto')}
            >
              Auto
            </Button>
          </div>
        </div>

        {/* Page Mode */}
        <div>
          <label className="text-sm font-medium mb-2 block">Page Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={settings.pageMode === 'paginated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('pageMode', 'paginated')}
            >
              Paginated
            </Button>
            <Button
              variant={settings.pageMode === 'scroll' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('pageMode', 'scroll')}
            >
              Scroll
            </Button>
          </div>
        </div>
    </div>
  );
}
