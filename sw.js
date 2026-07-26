// volunteer-tracker Service Worker — fast app-shell startup
// Static app files are served from the device cache. A fresh index.html is
// fetched in the background and becomes visible on the next launch.
const CACHE_VERSION = 'volunteer-tracker-shell-20260726-1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js?v=20260726-1',
  './apple-touch-icon-v2.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('volunteer-tracker-') && key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function navigationResponse(request, event) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match('./index.html', { ignoreSearch: true });
  const fresh = fetch(request, { cache: 'no-store' })
    .then(response => {
      if (response && response.ok) cache.put('./index.html', response.clone());
      return response;
    });

  if (cached) {
    event.waitUntil(fresh.catch(() => undefined));
    return cached;
  }

  try {
    return await fresh;
  } catch (error) {
    return Response.error();
  }
}

async function staticResponse(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && new URL(request.url).origin === self.location.origin) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(navigationResponse(event.request, event));
    return;
  }

  event.respondWith(staticResponse(event.request));
});
