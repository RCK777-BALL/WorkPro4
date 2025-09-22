import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ThemeProvider, useTheme, syncThemeToEnvironment } from './ThemeContext';

type ThemeContextValue = ReturnType<typeof useTheme>;

function ContextConsumer({ onRender }: { onRender: (value: ThemeContextValue) => void }) {
  const context = useTheme();
  onRender(context);
  return null;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders without throwing when window is undefined', () => {
    vi.stubGlobal('window', undefined);

    expect(() =>
      renderToString(
        <ThemeProvider>
          <span>content</span>
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('initializes from and synchronizes with browser APIs when available', () => {
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    };

    const storedDarkColors = {
      primary: '#101010',
      secondary: '#202020',
      accent: '#303030',
      background: '#111111',
      foreground: '#eeeeee',
      muted: '#222222',
      mutedForeground: '#dddddd',
      card: '#121212',
      cardForeground: '#fafafa',
      border: '#333333',
      success: '#44ff44',
      warning: '#ffaa00',
      error: '#ff4444',
      info: '#44aaff',
    };

    storage.set('wp3.theme.mode', 'dark');
    storage.set('wp3.theme.dark-colors', JSON.stringify(storedDarkColors));

    const matchMediaMock = vi.fn().mockReturnValue({ matches: false });
    const classListSet = new Set<string>();
    const classList = {
      toggle: (className: string, force?: boolean) => {
        const shouldHave = force ?? !classListSet.has(className);
        if (shouldHave) {
          classListSet.add(className);
        } else {
          classListSet.delete(className);
        }
      },
      contains: (className: string) => classListSet.has(className),
    };
    const styleMap = new Map<string, string>();
    const documentElement = {
      classList,
      style: {
        setProperty: (property: string, value: string) => {
          styleMap.set(property, value);
        },
      },
    };

    vi.stubGlobal('window', {
      localStorage: localStorageMock,
      matchMedia: matchMediaMock,
    });

    vi.stubGlobal('document', {
      documentElement,
    });

    let capturedContext: ThemeContextValue | undefined;

    renderToString(
      <ThemeProvider>
        <ContextConsumer onRender={(value) => {
          capturedContext = value;
        }} />
      </ThemeProvider>,
    );

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.isDark).toBe(true);
    expect(capturedContext?.colors.primary).toBe(storedDarkColors.primary);
    syncThemeToEnvironment(capturedContext?.isDark ?? false, capturedContext?.colors ?? storedDarkColors);

    expect(storage.get('wp3.theme.mode')).toBe('dark');
    expect(classList.contains('dark')).toBe(true);
    expect(styleMap.get('--color-primary')).toBe(storedDarkColors.primary);
  });
});
