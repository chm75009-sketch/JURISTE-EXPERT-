# Module « Analyse des offres d'emploi » — déploiement

Ce module récupère de vraies offres d'emploi via l'**API officielle France Travail**
(Offres d'emploi v2) et les analyse (compétences, contrats, salaires, lieux, entreprises).

Il se compose de **2 morceaux** :

| Fichier | Rôle | Où il tourne |
|---|---|---|
| `outils/offres.html` | La page (recherche + tableau de bord) | GitHub Pages (déjà en ligne avec l'app) |
| `outils/france-travail-proxy.js` | Le « relais » qui cache le `client_secret` | Cloudflare Workers (à déployer une fois) |

> **Pourquoi un relais ?** Le `client_secret` France Travail ne doit **jamais** apparaître
> dans le navigateur. Le relais s'exécute côté serveur : la page l'appelle, lui parle à
> France Travail avec le secret, et ne renvoie que les offres. Le secret reste caché.

---

## Étape 1 — Déployer le relais sur Cloudflare (≈ 10 min, gratuit)

1. Crée un compte sur **https://dash.cloudflare.com** (gratuit).
2. Menu de gauche : **Compute (Workers)** → **Workers & Pages** → **Create** → **Create Worker**.
3. Donne-lui un nom, ex. `france-travail-proxy`, puis **Deploy** (le code par défaut sera remplacé).
4. Clique **Edit code**. Efface tout, colle le contenu de **`france-travail-proxy.js`**, puis **Deploy**.
5. Note l'URL du worker affichée, du type :
   `https://france-travail-proxy.TON-COMPTE.workers.dev`

### Renseigner les secrets (client_id / client_secret)

6. Sur la page du Worker → **Settings** → **Variables and Secrets** → **Add**.
7. Ajoute ces **secrets** (type « Secret », pas « Text ») :

   | Nom | Valeur |
   |---|---|
   | `FT_CLIENT_ID` | l'identifiant client de ton appli francetravail.io (`PAR_analyseoffres_...`) |
   | `FT_CLIENT_SECRET` | la clé secrète (celle du fichier JSON téléchargé à la création) |

8. Ajoute aussi une **variable** (type « Text ») pour verrouiller l'accès :

   | Nom | Valeur |
   |---|---|
   | `ALLOWED_ORIGIN` | `https://chm75009-sketch.github.io` |

9. **Save and deploy**.
10. Test : ouvre `https://france-travail-proxy.TON-COMPTE.workers.dev/health`
    → tu dois voir `{"ok":true,...}`.

> 🔑 Le `client_secret` ne se colle **que** ici, dans Cloudflare. Jamais dans le code, jamais dans le chat.

---

## Étape 2 — Utiliser la page

1. Va sur : `https://chm75009-sketch.github.io/JURISTE-EXPERT-/outils/offres.html`
2. Saisis le **code d'accès** (par défaut : `offres-admin-2026` — voir plus bas pour le changer).
3. Clique **⚙︎ Configuration**, colle l'**URL de ton relais Cloudflare**, **Enregistrer**,
   puis **Tester la connexion** (doit afficher « Relais joignable ✓ »).
4. Lance une recherche (mots-clés, département, contrat…) → **Analyser les offres**.

---

## Personnalisation

### Changer le code d'accès
Dans `offres.html`, remplace la constante `PASS_HASH` par le hash SHA-256 de ton nouveau code.
Pour générer le hash (console Node) :
```js
require('crypto').createHash('sha256').update('TON_NOUVEAU_CODE').digest('hex')
```
> ⚠️ Cette protection est **légère** (site statique). Elle empêche l'accès occasionnel, mais
> la vraie protection des données sensibles reste le relais (qui, lui, cache le secret et
> limite les origines autorisées via `ALLOWED_ORIGIN`).

### Aller plus loin
Les API suivantes sont déjà autorisées sur ton appli France Travail et pourront enrichir
l'analyse dans une v2 (tendances de marché, compétences normalisées) :
`ROME 4.0 – Métiers`, `ROME 4.0 – Compétences`, `Marché du travail`, `ROMEO`.

---

## Sécurité — récapitulatif
- Le `client_secret` vit **uniquement** dans les secrets Cloudflare.
- Le relais n'accepte que l'origine `ALLOWED_ORIGIN`.
- La page ne contient aucun identifiant.
- Les offres affichées sont des **données publiques** France Travail.
