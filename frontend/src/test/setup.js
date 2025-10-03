import '@testing-library/jest-dom/vitest';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  window.ResizeObserver = MockResizeObserver;
}

if (typeof global !== 'undefined' && !('ResizeObserver' in global)) {
  // @ts-ignore - vitest global
  global.ResizeObserver = MockResizeObserver;
}
