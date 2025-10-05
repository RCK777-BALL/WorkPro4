import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Layout } from './Layout';

vi.mock('./Header', () => ({
  Header: ({ onToggleSidebar }: { onToggleSidebar: () => void }) => (
    <button type="button" onClick={onToggleSidebar}>
      Toggle
    </button>
  )
}));

vi.mock('./Sidebar', () => ({
  Sidebar: ({ onCollapseToggle }: { onCollapseToggle: () => void }) => (
    <button type="button" onClick={onCollapseToggle}>
      Sidebar
    </button>
  ),
  navItems: []
}));

vi.mock('./MobileNav', () => ({
  MobileNav: () => <div>MobileNav</div>
}));

describe('Layout component', () => {
  it('renders without window or localStorage', () => {
    const globalAny = globalThis as any;
    const originalWindow = globalAny.window;
    const originalLocalStorage = globalAny.localStorage;

    globalAny.window = undefined;
    globalAny.localStorage = undefined;

    try {
      expect(() => renderToString(<Layout />)).not.toThrow();
    } finally {
      if (originalWindow === undefined) {
        delete globalAny.window;
      } else {
        globalAny.window = originalWindow;
      }

      if (originalLocalStorage === undefined) {
        delete globalAny.localStorage;
      } else {
        globalAny.localStorage = originalLocalStorage;
      }
    }
  });
});
