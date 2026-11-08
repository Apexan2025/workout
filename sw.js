// Offline helper for the workout timer.
// With signal it always opens the newest version; offline (or after 4 s without an answer)
// it opens the copy saved on the phone.
const CACHE = 'workout-coach-v10';
const PAGES = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(PAGES.map(u => c.add(new Request(u, { cache: 'reload' }))))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // 'no-cache' asks GitHub for the latest file instead of a 10-minute-old copy
    const fresh = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    try {
      const res = await Promise.race([fresh, new Promise(r => setTimeout(r, 4000, null))]);
      if (res) return res;
    } catch (err) {}
    const saved = await cache.match(req, { ignoreSearch: true });
    return saved || fresh;
  })());
});
