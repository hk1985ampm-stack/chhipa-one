// App-shell cache so the app opens offline. Database calls always go to the network.
const V = 'chhipa-one-v17';
const SHELL = ['./','index.html','app.css','app.js','core.js','config.js','supabase.min.js','home.js','locations.js','staff.js','audit.js','registry.js','add.js','family.js','notifications.js','card.js','offline.js','communities.js','photo.js','pdf.js','stamp.png','memberform.js','options.js','events.js','lists.js','excel.js','backup.js','reports.js','tools.js','brand.js','requests.js','activity.js','bulkpdf.js','printcenter.js','scanner.js','reminders.js','branding.js','xlsx.js','manifest.webmanifest','icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
