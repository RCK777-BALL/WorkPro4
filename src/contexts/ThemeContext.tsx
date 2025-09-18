import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeColors {
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('wp3.theme.mode');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [lightColors, setLightColors] = useState<ThemeColors>(() => {
    const saved = localStorage.getItem('wp3.theme.light-colors');
    return saved ? JSON.parse(saved) : defaultLightColors;
  });

  const [darkColors, setDarkColors] = useState<ThemeColors>(() => {
    const saved = localStorage.getItem('wp3.theme.dark-colors');
    return saved ? JSON.parse(saved) : defaultDarkColors;
  });

  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const updateColors = (newColors: Partial<ThemeColors>) => {
    if (isDark) {
      const updated = { ...darkColors, ...newColors };
      setDarkColors(updated);
      localStorage.setItem('wp3.theme.dark-colors', JSON.stringify(updated));
    } else {
      const updated = { ...lightColors, ...newColors };
      setLightColors(updated);
      localStorage.setItem('wp3.theme.light-colors', JSON.stringify(updated));
    }
  };

  const resetColors = () => {
    if (isDark) {
      setDarkColors(defaultDarkColors);
      localStorage.setItem('wp3.theme.dark-colors', JSON.stringify(defaultDarkColors));
    } else {
      setLightColors(defaultLightColors);
      localStorage.setItem('wp3.theme.light-colors', JSON.stringify(defaultLightColors));
    }
  };

  useEffect(() => {
    localStorage.setItem('wp3.theme.mode', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
    
    // Apply CSS custom properties
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
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