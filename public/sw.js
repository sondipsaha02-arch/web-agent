// Service Worker for Tune AI Companion PWA WebAPK
const CACHE_NAME = 'tune-ai-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network first strategy to preserve live WebSockets & audio streams
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
