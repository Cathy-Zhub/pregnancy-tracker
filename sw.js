// Service worker for 孕期记录 PWA — enables offline / blocked-network opening.
// Strategy: network-first with cache fallback, so the app shell is cached after the
// first successful online load and can be served offline afterwards.
const CACHE = 'pt-cache-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Only handle same-origin requests (the app shell). Cross-origin (e.g. CDN) is not cached.
  if (url.origin !== self.location.origin) return;

  e.respondWith((async function () {
    var cache = await caches.open(CACHE);
    try {
      var net = await fetch(req);
      if (net && net.status === 200) {
        cache.put(req, net.clone());
      }
      return net;
    } catch (err) {
      var cached = await cache.match(req);
      if (cached) return cached;
      // For navigation requests, fall back to the cached entry of the current directory index.
      if (req.mode === 'navigate') {
        var fallback = await cache.match('./index.html') ||
                      await cache.match(self.location.pathname) ||
                      await cache.match('./');
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
