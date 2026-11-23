// HOLD VR — keeps the tour on the device. Release 252201a9a5.
// Pages: network first (6 s), offline → the copy saved after the last successful opening.
// tour-<hash>.bin: immutable, from the device first. The page itself saves the tour after it opened, so the first visit
// works offline later even if this worker was installed only afterwards.
const VERSION = '252201a9a5';
const SHELL = 'hold-vr-shell-' + VERSION, PAGES = 'hold-vr-pages', LEGACY = 'hold-vr';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('hold-vr-shell-') && k !== SHELL) await caches.delete(k);
  await self.clients.claim();
})()));
const scope = () => self.registration.scope;
async function page(req) {
  const url = req.url.split('#')[0];
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url, { cache: 'no-cache', credentials: 'same-origin', signal: ctl.signal }); clearTimeout(t);
    if (r.ok) return r.redirected ? Response.redirect(r.url, 302) : r;
    if (r.status < 500) return r;
  } catch (e) { /* offline or too slow: saved copy */ }
  const s = scope();
  for (const [name, key] of [[PAGES, s], [SHELL, s], [SHELL, s + 'index.html'], [LEGACY, s], [LEGACY, s + 'index.html']]) {
    if (!(await caches.has(name))) continue;
    const hit = await (await caches.open(name)).match(key, { ignoreSearch: true }); if (hit) return hit;
  }
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HOLD</title><body style="background:#0B1916;color:#E8F1EC;font:18px/1.4 sans-serif;padding:24px">Нет связи. Тур ещё не сохранён на этом устройстве. Откройте страницу при подключении к интернету.',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (/\/tour-[0-9a-f]+\.bin$/.test(url.pathname)) { e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))); return; }
  const s = scope(), bare = url.origin + url.pathname;
  if (req.mode === 'navigate' || bare === s || bare === s + 'index.html') { e.respondWith(page(req)); return; }
  if (bare === s + 'sw.js') return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
