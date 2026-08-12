// Service worker for 孕期记录 PWA — enables offline / blocked-network opening.
// Strategy: network-first for everything. Only successful same-origin 200 (basic) responses
// are cached. Navigations always try the network first; we never serve a redirect or an
// empty response, so a broken cached entry can never white-screen the standalone PWA.
const CACHE = 'pt-cache-v2';

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
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  e.respondWith((async function () {
    // Try the network first.
    try {
      var net = await fetch(req);
      // Only cache real successful same-origin responses (not redirects / opaque).
      if (net && net.status === 200 && net.type === 'basic') {
        (await caches.open(CACHE)).put(req, net.clone()).catch(function () {});
      }
      return net;
    } catch (err) {
      // Network failed — fall back to any cached copy of this exact request.
      var cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      // Last-ditch: any cached navigation HTML.
      if (req.mode === 'navigate') {
        var alt = await caches.match('/index.html', { ignoreSearch: true }) ||
                  await caches.match('./', { ignoreSearch: true });
        if (alt) return alt;
      }
      throw err; // genuinely offline with no cache — let the browser show its own error
    }
  })());
});
