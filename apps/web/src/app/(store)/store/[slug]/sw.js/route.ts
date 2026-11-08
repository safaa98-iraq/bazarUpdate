/** Minimal service worker for an installed store app: network first, offline page when there's no connection. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const scope = `/store/${params.slug}/`;
  const js = `
const CACHE = 'bz-store-${params.slug}-v1';
const OFFLINE = '${scope}__offline';
const OFFLINE_HTML = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لا يوجد اتصال</title><body style="font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;background:#f6f8fa;color:#0b3550"><div><p style="font-size:48px;margin:0">📶</p><h1 style="font-size:20px">لا يوجد اتصال بالإنترنت</h1><p>تحقق من الاتصال وحاول مرة أخرى.</p><button onclick="location.reload()" style="padding:10px 22px;border:0;border-radius:999px;background:#20A9F4;color:#fff;font-size:15px">إعادة المحاولة</button></div></body></html>';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.put(OFFLINE, new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('bz-store-${params.slug}-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
  }
});`;
  return new Response(js, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Service-Worker-Allowed': scope, 'Cache-Control': 'no-cache' },
  });
}
