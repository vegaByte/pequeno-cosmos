const PREFIX = `pequeno-cosmos:${self.registration.scope}:`;
const CACHE = `${PREFIX}v2`;
const FILES = ['./', './index.html', './style.css', './game.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  // Only the known app shell is served from cache. No data or foreign requests are stored.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      // Keep HTML and assets on the same installed version, including offline launches.
      return await cache.match('./index.html') || fetch(event.request);
    }
    return await cache.match(event.request, { ignoreSearch: true }) || fetch(event.request);
  })());
});
