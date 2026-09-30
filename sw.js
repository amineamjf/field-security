// كاش أولاً لكل طلبات GET (الصفحة + tfjs + نموذج BlazeFace)، باستثناء /api
// مهم: شغّل التطبيق مرة واحدة أونلاين ليتخزن النموذج قبل الخروج للميدان.
const CACHE = 'worker-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.startsWith('/api')) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })
  );
});
