/* Daily Deal App — Service Worker
   নীতি: সবসময় আগে নেটওয়ার্ক (সর্বশেষ ফাইল), নেটওয়ার্ক না থাকলে ক্যাশ।
   তাই ফাইল আপডেট করলে ইউজার পরের বার খুললেই নতুন ভার্সন পাবে। */
const CACHE = 'dd-app-v1';
const PRECACHE = ['./', 'index.html', 'admin/index.html', 'shell.js', 'shell.css', 'config.js',
  'manifest.webmanifest', 'admin/manifest.webmanifest', 'icons/logo-splash.png',
  'icons/admin-logo-splash.png', 'icons/icon-192.png', 'icons/admin-icon-192.png',
  'app-bridge.js', 'site/index.html', 'site/admin.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u)))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }));
      if (res && res.ok && url.pathname.indexOf('version.json') < 0) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
