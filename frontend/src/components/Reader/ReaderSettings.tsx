import { useEffect, useState } from 'react';
import { db, type Settings } from '../../lib/db';
import { Button } from '../ui/button';
import { X, Sun, Moon } from 'lucide-react';
import { epubService } from '../../services/epubService';

interface ReaderSettingsProps {
  onClose: () => void;
  onSettingsChange: () => void;
}

const defaultSettings: Settings['reading'] = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.6,
  theme: 'light',
  pageMode: 'paginated',
};

export function ReaderSettings({ onClose, onSettingsChange }: ReaderSettingsProps) {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const saved = await db.settings.toArray();
    if (saved.length > 0) {
      setSettings(saved[0].reading);
    }
  };

  const saveSettings = async (newSettings: Settings['reading']) => {
    try {
      const existing = await db.settings.toArray();
      if (existing.length > 0) {
        await db.settings.update(existing[0].id!, { reading: newSettings });
      } else {
        await db.settings.add({ reading: newSettings });
      }
      setSettings(newSettings);
      
      // Apply settings immediately
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

  const updateSetting = <K extends keyof Settings['reading']>(
    key: K,
    value: Settings['reading'][K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-background border-l shadow-lg z-10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Reader Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-4rem)]">
        {/* Theme */}
        <div>
          <label className="text-sm font-medium mb-2 block">Theme</label>
          <div className="grid grid-cols-3 gap-2">
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
    </div>
  );
}
