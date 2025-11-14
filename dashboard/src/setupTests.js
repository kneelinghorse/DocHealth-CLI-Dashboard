import '@testing-library/jest-dom/vitest'

// Nivo charts depend on ResizeObserver which isn't available in jsdom by default.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserver
  global.ResizeObserver = ResizeObserver
}
