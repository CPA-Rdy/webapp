// Minimal service worker — exists only to make the app installable as a
// desktop/tablet PWA (Chrome/Edge require an active SW registration with a
// fetch handler before they'll show the install icon in the address bar).
//
// It deliberately does NOT cache or intercept anything — every request just
// passes straight through to the network, so nothing about how the app
// loads or updates changes. If you want real offline support later, this is
// the file to extend (cache the shell on 'install', serve it on 'fetch'
// when offline) — but that's a separate, bigger change, not part of this.

self.addEventListener('install', (event) => {
  // Activate this SW as soon as it's finished installing, instead of
  // waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any already-open tabs immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through only — required so the browser recognizes this as a
  // "real" service worker for installability purposes, without changing
  // any request/response behavior.
  event.respondWith(fetch(event.request));
});
