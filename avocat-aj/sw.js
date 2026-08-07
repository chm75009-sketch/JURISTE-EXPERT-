/* Service worker — site CJ AVOCATS.
   Il rend le site installable (« Ajouter à l'écran d'accueil ») et consultable
   hors ligne. Il ne connaît QUE les fichiers de ce dossier : rien de Juris
   Expert n'est mis en cache, et rien d'ici n'écrase le cache d'une autre app.

   Après chaque modification du site, incrémentez CACHE (v2, v3…) : c'est ce
   qui force les téléphones déjà installés à récupérer la nouvelle version. */
const CACHE = 'cj-avocats-v3';

const FICHIERS = [
  './',
  './index.html',
  './mentions-legales.html',
  './confidentialite.html',
  './registre-traitements.html',
  './pages.css',
  './domaine-famille.html',
  './domaine-immobilier.html',
  './domaine-travail.html',
  './domaine-commercial.html',
  './domaine-baux-commerciaux.html',
  './domaine-societes.html',
  './manifest.json',
  './icone-192.png',
  './icone-512.png',
  './icone-180.png',
  './portrait.png'
];

self.addEventListener('install', e => {
  /* Mise en cache une par une : un fichier manquant (le portrait, par
     exemple) ne doit pas faire échouer l'installation entière. */
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FICHIERS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf('cj-avocats-') === 0)
                                .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // le formulaire passe par le réseau
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;             // Google Fonts, API : réseau direct

  /* Navigation : le réseau d'abord (le site reste à jour), le cache en
     secours quand il n'y a plus de connexion. */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  /* Autres ressources : le cache d'abord, le réseau ensuite. */
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
    }).catch(() => m))
  );
});
