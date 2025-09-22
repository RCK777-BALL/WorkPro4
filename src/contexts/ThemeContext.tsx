import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  updateColors: (colors: Partial<ThemeColors>) => void;
  resetColors: () => void;
}

const defaultLightColors: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#8b5cf6',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  card: '#ffffff',
  cardForeground: '#0f172a',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
};

const defaultDarkColors: ThemeColors = {
  primary: '#60a5fa',
  secondary: '#94a3b8',
  accent: '#a78bfa',
  background: '#0f172a',
  foreground: '#f8fafc',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  card: '#1e293b',
  cardForeground: '#f8fafc',
  border: '#334155',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#22d3ee',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function safeSetItem(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

export function syncThemeToEnvironment(isDark: boolean, colors: ThemeColors) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  safeSetItem('wp3.theme.mode', isDark ? 'dark' : 'light');
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const saved = window.localStorage.getItem('wp3.theme.mode');
      if (saved) {
        return saved === 'dark';
      }
    } catch {
      // Ignore storage access errors and fall back to defaults.
    }

    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  });

  const [lightColors, setLightColors] = useState<ThemeColors>(() => {
    if (typeof window === 'undefined') {
      return defaultLightColors;
    }

    try {
      const saved = window.localStorage.getItem('wp3.theme.light-colors');
      return saved ? JSON.parse(saved) : defaultLightColors;
    } catch {
      return defaultLightColors;
    }
  });

  const [darkColors, setDarkColors] = useState<ThemeColors>(() => {
    if (typeof window === 'undefined') {
      return defaultDarkColors;
    }

    try {
      const saved = window.localStorage.getItem('wp3.theme.dark-colors');
      return saved ? JSON.parse(saved) : defaultDarkColors;
    } catch {
      return defaultDarkColors;
    }
  });

  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const updateColors = (newColors: Partial<ThemeColors>) => {
    if (isDark) {
      const updated = { ...darkColors, ...newColors };
      setDarkColors(updated);
      safeSetItem('wp3.theme.dark-colors', JSON.stringify(updated));
    } else {
      const updated = { ...lightColors, ...newColors };
      setLightColors(updated);
      safeSetItem('wp3.theme.light-colors', JSON.stringify(updated));
    }
  };

  const resetColors = () => {
    if (isDark) {
      setDarkColors(defaultDarkColors);
      safeSetItem('wp3.theme.dark-colors', JSON.stringify(defaultDarkColors));
    } else {
      setLightColors(defaultLightColors);
      safeSetItem('wp3.theme.light-colors', JSON.stringify(defaultLightColors));
    }
  };

  useEffect(() => {
    syncThemeToEnvironment(isDark, colors);
  }, [isDark, colors]);

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, updateColors, resetColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}