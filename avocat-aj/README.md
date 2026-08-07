# Site du cabinet CJ AVOCATS

Site vitrine de **Maître Adel JEDDI**, avocat au Barreau du Val-d'Oise,
63 rue Paul Vaillant-Couturier, 95100 Argenteuil.

Ce dossier est **autonome** : il ne lit aucun fichier de Juris Expert, et Juris
Expert ne le lit pas non plus. Aucun lien ne mène de l'application au site, et
chaque page porte une balise `noindex` — il est donc invisible tant qu'il vit
ici. Le jour venu, on le déplace tel quel dans son propre dépôt : rien à
réécrire.

---

## 1. Architecture

```
avocat-aj/
├── index.html            ← tout le site : une page, huit sections
├── mentions-legales.html ← obligatoire (LCEN + décret 2005-790)
├── confidentialite.html  ← obligatoire (RGPD + règlement européen sur l'IA)
├── registre-traitements.html ← registre de l'article 30, publié
├── pages.css             ← charte des deux pages légales
├── manifest.json         ← carte d'identité de l'application installable
├── sw.js                 ← service worker : hors ligne + installation
├── netlify.toml          ← hébergement + en-têtes de sécurité (site autonome)
├── robots.txt            ← pour les moteurs, une fois en ligne
├── sitemap.xml           ← plan du site, une fois en ligne
├── icone-192.png         ← icônes de l'application
├── icone-512.png
├── icone-180.png         ← icône iPhone (apple-touch-icon)
├── icones.py             ← régénère les trois icônes (python3 icones.py .)
└── portrait.png          ← la photo, détourée au cercle : elle remplace le
                            monogramme dans le bandeau et dans la signature
```

L'accueil déroule, dans cet ordre :

| # | Section | Contenu |
|---|---------|---------|
| 1 | Bandeau | Barreau, années d'expérience, deux boutons, juridictions, portrait |
| 2 | Trois promesses | Réactivité · Disponibilité · Suivi attentif |
| 3 | Le cabinet | Présentation, serment, signature — puis les 6 prestations |
| 4 | Domaines | 6 fiches + focus « baux commerciaux » + note « cas mixtes » |
| 5 | Votre dossier | Les 4 étapes, du premier échange à l'audience |
| 6 | Honoraires | Grille des taux horaires par domaine, forfait, AJ, protection juridique |
| 7 | Avis clients | Carrousel façon Google, avec la réponse du cabinet |
| 8 | Questions | 8 questions fréquentes, une par domaine |
| 9 | Contact | Formulaire qualifié + coordonnées + encart « délai qui expire » |

---

## 2. Ce qu'il reste à remplir

Tout ce qui manque est surligné en jaune sur le site et écrit entre crochets
dans le code. Pour tous les retrouver :

```bash
grep -n "\[[A-ZÉÈÀÇ0-9]" avocat-aj/*.html
```

| Marque | Où | Quoi |
|--------|----|------|
| `[EMAIL]` | accueil, mentions, confidentialité | Adresse électronique du cabinet |
| Horaires | accueil | Seule la **fermeture à 20 h** est connue (fiche Google). L'heure d'ouverture reste surlignée, et « rendez-vous en soirée sur demande » attend confirmation |
| `[GARE / PARKING]` | accueil | Accès (gare d'Argenteuil, parking…) |
| Photo **provisoire** | bandeau + signature | `portrait.png` est en place : le cliché de la fiche Google, détouré et recadré au cercle (294 px). Il fait l'affaire, mais il est petit — sur un écran haute densité il manque de piqué. À remplacer par une photo de studio dès qu'il y en a une : déposer le fichier dans le dossier et écrire son nom dans `var PORTRAIT` (script de `index.html`), carré de préférence, 800 px minimum |
| `[CLÉ_WEB3FORMS]` | accueil (formulaire) | Voir § 3 |
| `[ASSUREUR ET N° DE POLICE]` | mentions | RCP et garantie financière |
| `[HÉBERGEUR]` | mentions | Netlify, ou l'hébergeur retenu |
| `[DOMAINE]` | robots.txt, sitemap.xml | Le domaine, une fois choisi |
| Déclaration sur les outils d'IA | confidentialite.html | La phrase surlignée du § « Le secret professionnel face aux outils d'IA » **engage le cabinet** : Maître Adel JEDDI doit la valider, ou l'adapter si des outils sont utilisés |
| `[FOURNISSEUR DE MESSAGERIE]`, `[PAYS]` | confidentialite.html | Le service qui reçoit les messages (Gmail, OVH, Infomaniak…) et son pays : c'est un sous-traitant, il doit être nommé |

### Trois vérifications avant la mise en ligne — obligations, pas options

1. **Contrat de sous-traitance (art. 28 du RGPD)** signé avec chacun des trois
   prestataires nommés dans la politique : hébergeur, service de formulaire,
   messagerie. Sans contrat, le transfert de données est irrégulier.
2. **Transferts hors UE.** Deux prestataires sont américains. Vérifiez leur
   certification au registre officiel du *Data Privacy Framework*, ou faites
   signer les clauses contractuelles types. Une messagerie hébergée dans l'Union
   supprimerait ce transfert pour la partie la plus sensible — c'est le choix
   que je recommande à un cabinet d'avocat.
3. **Registre des traitements (art. 30).** Il est écrit, et publié :
   `registre-traitements.html`, trois traitements aux huit rubriques exigées.
   La loi n'oblige qu'à le tenir — le publier est un parti pris, celui de Nomos.
   Vérifiez qu'il correspond à la réalité du cabinet avant la mise en ligne.

Les **avis clients** sont ceux de la fiche Google, recopiés sans retouche dans
le tableau `AVIS`, à la fin de `index.html` — ni correction d'orthographe, ni
coupe, ni tri favorable : la politique de confidentialité affirme qu'ils sont
« reproduits tels quels », et il faut que ce soit vrai. Pour en ajouter un,
copiez le nom, le mois, la note et le texte. **N'inventez jamais d'avis** :
un faux avis est une pratique commerciale trompeuse (art. L.121-2 du code de
la consommation), et une faute déontologique pour un avocat.

Les dates sont écrites en mois absolus (« mars 2025 ») et non en relatif
(« il y a un an ») : une date relative se périme toute seule.

Les **années d'expérience** ne sont écrites nulle part en dur : elles se
calculent à partir de la date de serment (7 juin 2004) inscrite dans le script.
Le site affichera « 23 ans » l'an prochain sans que personne n'y touche.

---

## 3. Le formulaire de contact

Le site n'a pas de serveur : le formulaire passe par **Web3Forms**, qui
réexpédie chaque demande par courrier électronique (gratuit, sans compte à
créer, aucune donnée conservée).

1. Aller sur [web3forms.com](https://web3forms.com), saisir l'adresse
   électronique du cabinet, récupérer la clé reçue par courriel.
2. Dans `index.html`, remplacer `[CLÉ_WEB3FORMS]` par cette clé.
3. Remplacer aussi `[EMAIL]` (deux endroits : les coordonnées et la variable
   `EMAIL` du script).

Tant que la clé n'est pas renseignée, le formulaire **ne casse pas** : il
propose d'ouvrir la messagerie du visiteur avec le message pré-rempli. Le
cabinet n'est jamais injoignable.

---

## 4. Voir le site

Un double-clic sur `index.html` suffit. Pour tester l'installation en
application (le service worker exige `http://` et non `file://`) :

```bash
cd avocat-aj && python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

---

## 5. Mettre le site en ligne

1. **Retirer les trois balises `noindex`** — une par page HTML. Elles sont
   signalées par un gros commentaire en tête de fichier. Tant qu'elles sont
   là, Google ignore le site.
2. Remplacer `[DOMAINE]` dans `robots.txt` et `sitemap.xml`.
3. Publier (voir § 6), brancher le domaine, puis déclarer le site dans la
   Google Search Console et sur la fiche Google Business du cabinet.

---

## 6. Sortir le site de ce dépôt

C'est l'objectif dès le départ. Le dossier ne dépend de rien d'autre que
lui-même.

```bash
# 1. copier le dossier ailleurs
cp -r avocat-aj ~/site-cj-avocats
cd ~/site-cj-avocats

# 2. en faire un dépôt
git init && git add -A && git commit -m "Site du cabinet CJ AVOCATS"
git branch -M main
git remote add origin git@github.com:<compte>/site-cj-avocats.git
git push -u origin main

# 3. publier
#    Netlify : « Add new site » → « Import from GitHub » → choisir le dépôt.
#    Le netlify.toml fait le reste : aucune commande de compilation,
#    en-têtes de sécurité et CSP déjà configurés.
#    (GitHub Pages fonctionne aussi, mais ne permet pas ces en-têtes.)

# 4. supprimer le dossier du dépôt Juris Expert
```

Rien d'autre à modifier : tous les chemins du site sont relatifs (`./`).

---

## 7. En faire une application

Le site **est déjà** une application installable : `manifest.json` + `sw.js` +
les icônes suffisent.

- **Android / Chrome** : le navigateur propose « Installer l'application ».
- **iPhone / Safari** : Partager → « Sur l'écran d'accueil ».
- Une fois installée, elle s'ouvre en plein écran, sans barre d'adresse, et
  reste consultable **hors connexion**.

Pour aller jusqu'aux magasins d'applications (Play Store, App Store), le même
dossier se réemballe sans être réécrit :

| Outil | Ce qu'il produit |
|-------|------------------|
| **Bubblewrap** (Google) | Un `.aab` Android à partir de l'URL du site — publiable sur le Play Store |
| **PWABuilder** (Microsoft) | Les paquets Android **et** iOS, depuis une page web |
| **Capacitor** | Une vraie application native embarquant le site, si des fonctions du téléphone deviennent nécessaires |

Après chaque modification du site, **incrémentez `CACHE` dans `sw.js`**
(`cj-avocats-v1` → `v2`) : c'est ce qui force les téléphones déjà équipés à
récupérer la nouvelle version.

---

## 8. Vérifier que rien n'est cassé

```bash
node tests/avocat.test.js     # depuis la racine du dépôt Juris Expert
```

Le test ouvre le site dans un vrai navigateur et vérifie : aucune erreur
JavaScript, le retour présent sur chaque page, le formulaire qui bascule sur la
messagerie tant que la clé manque, le carrousel d'avis, la grille tarifaire,
les balises `noindex`, et l'absence totale de lien vers Juris Expert.

Une fois le dossier sorti dans son propre dépôt, copiez-y ce test et remplacez
le chemin en tête de fichier.
