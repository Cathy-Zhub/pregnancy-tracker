// 孕期记录 — Service Worker
// 作用：把页面缓存到本地，主屏 PWA 打开时优先用缓存秒开，
// 彻底摆脱 pages.dev 在国内网络下间歇性卡顿/白屏的问题。
// 云端同步（LeanCloud）走跨域请求，这里一律放行、不缓存、不影响。
const CACHE = 'pt-v7';
const TIMEOUT = 6000; // 网络超过 6 秒就直接用缓存，避免白屏等待

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 新版本立即生效
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;            // 只处理 GET
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域（云端 API）直接放行

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    // 网络优先，但最多等 6 秒；超时或失败则回退到缓存（绝不白屏）
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), TIMEOUT));
    const fast = await Promise.race([network, timeout]);

    if (fast) return fast;          // 网络正常：用最新版并刷新缓存
    if (cached) return cached;       // 网络卡顿：用本地缓存秒开
    // 首次打开、缓存尚未建立且网络慢：兜底继续等网络
    return (await network) || Response.error();
  })());
});
