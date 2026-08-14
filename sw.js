/* Service worker — Juris Expert MCH (PWA installable + hors ligne + mise à jour forcée) */
const CACHE = 'jem-v166';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './vendor/xlsx.full.min.js', './vendor/jszip.min.js',
  /* Les pages annexes atteignables depuis le menu ou l'accueil. Elles
     n'etaient pas mises en cache : l'application se disait « utilisable hors
     ligne » et quatre entrees de menu ne l'etaient pas. */
  './elections-cse.html', './controle-minute.html', './defense-cph.html',
  './ferroviaire.html', './outils/offres.html'];

self.addEventListener('install', e => {
  /* addAll echoue en bloc si UNE seule ressource manque : le cache restait
     alors vide et rien n'etait disponible hors ligne. On met en cache une a
     une, et ce qui manque ne fait pas tomber le reste. */
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
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
  /* Navigation : cache d'abord, rafraichissement en arriere-plan.
     Le reseau d'abord obligeait le telephone a retelecharger index.html
     (880 Ko compresses) AVANT le moindre affichage, a chaque ouverture.
     La mise a jour n'est pas perdue pour autant : version.json reste
     toujours pris sur le reseau et declenche la mise a jour forcee. */
  if (req.mode === 'navigate') {
    const isApp = (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
    e.respondWith(
      caches.match(isApp ? './index.html' : req).then(cached => {
        const reseau = fetch(req).then(r => {
          // On ne met en cache "./index.html" QUE pour l'app elle-même — pas pour les autres pages
          // (sinon ouvrir maquette-accueil.html écrasait l'app en cache).
          if (isApp && r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); }
          return r;
        }).catch(() => cached);
        // Le rafraichissement continue meme si la reponse en cache est deja rendue.
        if (cached) e.waitUntil(reseau.catch(() => null));
        return cached || reseau;
      })
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
