// Simple Service Worker for PWA installability
const CACHE_NAME = '16eyes-farmhouse-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle the request normally
  // This is just a placeholder to satisfy PWA requirements
  event.respondWith(fetch(event.request));
});
