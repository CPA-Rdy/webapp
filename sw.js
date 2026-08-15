// Service worker for CPA Ready — provides real offline support.
//
// Strategy:
//  - The app shell (the HTML page itself) uses "network-first, falling back
//    to cache": an online user always gets the latest deploy, but the app
//    still opens normally when there's no connection at all.
//  - Everything else (fonts, manifest, icons, etc.) uses "cache-first,
//    falling back to network", and opportunistically caches whatever it
//    fetches — so offline support gets more complete the more the app has
//    already been used online, without needing to hardcode every asset path
//    up front.
//  - POST requests (e.g. the license-key check) are never intercepted —
//    those always need a live network round trip and should fail normally
//    when offline, not be served from cache.
//
// IMPORTANT: bump CACHE_NAME on any deploy where index.html changes
// meaningfully, so returning users get the update instead of an old
// cached shell hanging around indefinitely. The 'activate' handler below
// automatically deletes any previous cache once a new CACHE_NAME is live.

const CACHE_NAME = 'cpaready-shell-v1';
const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {}) // don't block install if e.g. manifest.json isn't found
  );
  // Activate this SW as soon as it's finished installing, instead of
  // waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim()) // take control of already-open tabs immediately
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never intercept non-GET requests (license validation, etc.) — those
  // must always hit the real network and fail honestly if offline.
  if (req.method !== 'GET') return;

  // Page loads — network-first, cache fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  // Everything else — cache-first, network fallback, cache what we fetch.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // offline and not cached — let it fail naturally
      return cached || networkFetch;
    })
  );
});
