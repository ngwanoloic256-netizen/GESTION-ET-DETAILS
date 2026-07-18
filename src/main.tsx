// Safe polyfill/fix for read-only window.fetch/globalThis.fetch in iframe/preview environments
try {
  const originalFetch = typeof window !== 'undefined' ? window.fetch : undefined;
  if (originalFetch) {
    let currentFetch = originalFetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return currentFetch;
      },
      set(newFetch) {
        currentFetch = newFetch;
      },
      configurable: true,
      enumerable: true,
    });
  }
} catch (e) {
  console.warn('Failed to define fetch setter:', e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
