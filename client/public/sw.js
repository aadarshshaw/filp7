const CACHE_NAME = 'flip7-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We won't aggressively cache right now to ensure game updates are live,
  // but a fetch listener is required for PWA installation in some browsers.
  event.respondWith(fetch(event.request));
});
