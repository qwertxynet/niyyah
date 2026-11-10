const CACHE = 'niyyah-shell-v3';

// Everything the app needs to open with no network at all.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './cities.json',
  './quran-meta.json',
  './fonts/amiri-arabic-400.woff2',
  './fonts/amiri-arabic-700.woff2',
];

// Data files that may be republished between releases: try the network first so a
// new city list actually lands, but keep the cached copy for offline use.
const REFRESH = new Set(['./cities.json', './quran-meta.json']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(CORE.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so updates land, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match('./index.html');
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (REFRESH.has(`./${url.pathname.replace(/^\/+/, '')}`)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (await caches.match(request)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed assets: cache first, then network (and remember it for offline).
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
