// Keeps the tour on the device after the first visit, so it also opens with weak or no internet at the stand.
const CACHE = 'hold-vr';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const immutable = /\/tour-[0-9a-f]+\.bin$/.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit && immutable) return hit;                       // a tour file never changes: its name carries its hash
    const net = fetch(req).then(async (r) => {
      if (r.ok) {
        if (immutable) for (const k of await c.keys()) if (/\/tour-[0-9a-f]+\.bin$/.test(k.url) && k.url !== req.url) await c.delete(k);
        await c.put(req, r.clone());
      }
      return r;
    }).catch(() => hit || Response.error());
    return immutable ? net : (hit || net);                  // pages: cached copy now, fresh copy next time
  }));
});
