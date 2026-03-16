import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Reset URL search params between tests to prevent state leakage
afterEach(() => {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname);
  }
});

// Polyfill matchMedia for jsdom (skip in non-browser environments)
if (typeof window !== 'undefined') Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Polyfill ResizeObserver for jsdom
if (typeof window !== 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
  });
}
