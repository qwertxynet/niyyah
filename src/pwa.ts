import { Capacitor } from '@capacitor/core';

/**
 * The native shells already ship every asset locally, so the service worker is
 * only for the browser build — where it is the difference between "reload works
 * on a plane" and "reload shows a dinosaur".
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  // Never cache dev-server modules: only the production shell is offline-worthy.
  if (!import.meta.env.PROD) return;
  if (Capacitor.isNativePlatform()) return;
  if (!('serviceWorker' in navigator)) return;
  if (window.niyyah?.platform === 'electron') return;
  if (!location.protocol.startsWith('http')) return;

  window.addEventListener('load', () => {
    const url = new URL('sw.js', document.baseURI).toString();
    navigator.serviceWorker.register(url).catch(() => {
      // Offline caching is a bonus, never a requirement for the app to run.
    });
  });
}
