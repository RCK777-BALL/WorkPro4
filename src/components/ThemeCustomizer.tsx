import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ColorPicker } from './ui/ColorPicker';
import { X, Sun, Moon, RotateCcw } from 'lucide-react';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeCustomizer({ isOpen, onClose }: ThemeCustomizerProps) {
  const { isDark, colors, toggleTheme, updateColors, resetColors } = useTheme();
  const [activeTab, setActiveTab] = useState<'colors' | 'presets'>('colors');

  const colorPresets = [
    {
      name: 'Ocean Blue',
      colors: {
        primary: '#0ea5e9',
        secondary: '#64748b',
        accent: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      }
    },
    {
      name: 'Forest Green',
      colors: {
        primary: '#059669',
        secondary: '#6b7280',
        accent: '#10b981',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      }
    },
    {
      name: 'Royal Purple',
      colors: {
        primary: '#7c3aed',
        secondary: '#64748b',
        accent: '#a855f7',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      }
    },
    {
      name: 'Sunset Orange',
      colors: {
        primary: '#ea580c',
        secondary: '#64748b',
        accent: '#f97316',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      }
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Theme Customizer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Theme Mode Toggle */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Theme Mode</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Switch to {isDark ? 'Light' : 'Dark'} Mode
              </button>
              <button
                onClick={resetColors}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Colors
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('colors')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'colors'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Custom Colors
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'presets'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Color Presets
              </button>
            </div>
          </div>

          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  label="Primary Color"
                  value={colors.primary}
                  onChange={(color) => updateColors({ primary: color })}
                />
                <ColorPicker
                  label="Secondary Color"
                  value={colors.secondary}
                  onChange={(color) => updateColors({ secondary: color })}
                />
                <ColorPicker
                  label="Accent Color"
                  value={colors.accent}
                  onChange={(color) => updateColors({ accent: color })}
                />
                <ColorPicker
                  label="Background Color"
                  value={colors.background}
                  onChange={(color) => updateColors({ background: color })}
                />
                <ColorPicker
                  label="Text Color"
                  value={colors.foreground}
                  onChange={(color) => updateColors({ foreground: color })}
                />
                <ColorPicker
                  label="Muted Background"
                  value={colors.muted}
                  onChange={(color) => updateColors({ muted: color })}
                />
                <ColorPicker
                  label="Success Color"
                  value={colors.success}
                  onChange={(color) => updateColors({ success: color })}
                />
                <ColorPicker
                  label="Warning Color"
                  value={colors.warning}
                  onChange={(color) => updateColors({ warning: color })}
                />
                <ColorPicker
                  label="Error Color"
                  value={colors.error}
                  onChange={(color) => updateColors({ error: color })}
                />
                <ColorPicker
                  label="Info Color"
                  value={colors.info}
                  onChange={(color) => updateColors({ info: color })}
                />
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {colorPresets.map((preset) => (
                  <div
                    key={preset.name}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => updateColors(preset.colors)}
                  >
                    <h4 className="font-medium mb-3">{preset.name}</h4>
                    <div className="flex gap-2">
                      {Object.values(preset.colors).map((color, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="mt-6 p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Preview</h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: colors.primary, color: 'white' }}>
                  Primary
                </div>
                <div className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: colors.secondary, color: 'white' }}>
                  Secondary
                </div>
                <div className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: colors.accent, color: 'white' }}>
                  Accent
                </div>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: colors.success, color: 'white' }}>
                  Success
                </div>
                <div className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: colors.warning, color: 'white' }}>
                  Warning
                </div>
                <div className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: colors.error, color: 'white' }}>
                  Error
                </div>
                <div className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: colors.info, color: 'white' }}>
                  Info
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}