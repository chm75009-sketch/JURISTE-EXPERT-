/* Service worker — Juris Expert MCH (PWA installable + hors ligne + mise à jour forcée) */
const CACHE = 'jem-v34';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Ressources tierces (polices, CDN) : réseau direct
  if (url.origin !== location.origin) return;
  // version.json : TOUJOURS le réseau, jamais le cache (pilote la mise à jour forcée)
  if (url.pathname.indexOf('version.json') >= 0) { e.respondWith(fetch(req)); return; }
  // Navigation : réseau d'abord (mises à jour), cache en secours hors ligne
  if (req.mode === 'navigate') {
    const isApp = (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
    e.respondWith(
      fetch(req).then(r => {
        // On ne met en cache "./index.html" QUE pour l'app elle-même — pas pour les autres pages
        // (sinon ouvrir maquette-accueil.html écrasait l'app en cache).
        if (isApp) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); }
        return r;
      }).catch(() => caches.match(req).then(m => m || (isApp ? caches.match('./index.html') : undefined)))
    );
    return;
  }
  // Autres ressources same-origin : cache d'abord, puis réseau
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
    }).catch(() => m))
  );
});
