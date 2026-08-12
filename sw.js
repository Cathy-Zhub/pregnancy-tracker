// Service Worker is intentionally disabled for this app (it caused blank screens in
// standalone PWA mode). This script only exists to cleanly unregister itself if an
// older registration somehow persists. It does NOT cache or intercept anything.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.registration.unregister(); })
  );
});
self.addEventListener('fetch', function () { /* transparent: let the browser handle all requests */ });
