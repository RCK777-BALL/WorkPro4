import React, { useState } from 'react';
import { Palette, RotateCcw } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
}

export function ColorPicker({ label, value, onChange, presets = [] }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultPresets = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
  ];

  const allPresets = presets.length > 0 ? presets : defaultPresets;

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg border-2 border-border shadow-sm relative overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Palette className="w-4 h-4 text-white drop-shadow-sm" />
          </div>
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
          placeholder="#000000"
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-border cursor-pointer"
        />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[200px]">
          <div className="grid grid-cols-5 gap-2 mb-3">
            {allPresets.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className="w-8 h-8 rounded-md border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}