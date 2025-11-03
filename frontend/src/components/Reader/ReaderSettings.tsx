import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { settingsApiService } from '../../services/settingsApiService';
import { epubService } from '../../services/epubService';
import { resolveTheme } from '../../hooks/useTheme';
import type { Theme, PageMode } from '../../types';

interface ReaderSettingsProps {
  onSettingsChange: () => void;
}

interface ReaderSettingsState {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: Theme;
  pageMode: PageMode;
}

const defaultSettings: ReaderSettingsState = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.6,
  theme: 'system',
  pageMode: 'paginated',
};

export function ReaderSettings({ onSettingsChange }: ReaderSettingsProps) {
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
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: ReaderSettingsState) => {
    try {
      await settingsApiService.updateReadingSettings({
        font_size: newSettings.fontSize,
        font_family: newSettings.fontFamily,
        line_height: newSettings.lineHeight,
        theme: newSettings.theme,
        page_mode: newSettings.pageMode,
      });
      setSettings(newSettings);
      
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
      
      onSettingsChange();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updateSetting = <K extends keyof ReaderSettingsState>(
    key: K,
    value: ReaderSettingsState[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
    
    // Page mode changes require a book reload
    if (key === 'pageMode') {
      setTimeout(() => {
        window.location.reload();
      }, 500);
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
            className="w-full px-3 py-2 border rounded-md bg-background"
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
