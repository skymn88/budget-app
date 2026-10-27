/* SKY servis çalışanı: çevrimdışı çalışma.
   Önce ağdan dener (güncellemeler hemen gelsin), olmazsa önbellekten verir.
   Araç dosyaları shared/tools.js listesinden otomatik önbelleğe alınır. */
importScripts('shared/tools.js');

const CACHE = 'sky-v2';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  'shared/theme.css', 'shared/common.js', 'shared/tools.js'];
const TOOL_FILES = TOOLS.flatMap(t => (t.files || ['index.html', 'app.js']).map(f => t.path + f));

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled([...CORE, ...TOOL_FILES].map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
