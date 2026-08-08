# Brief — troisième maquette du site CJ AVOCATS

**Destinataire : Claude Fable 5.** Ce document se suffit à lui-même : tout ce
qu'il faut savoir pour produire la maquette est ici, y compris ce qu'il ne
faut surtout pas faire.

---

## 1. La commande, en une phrase

Produire **`avocat-aj/maquette-3.html`** : le **déroulé** du site actuel
(`avocat-aj/index.html`), habillé de la **charte** de la deuxième maquette
(`avocat-aj/maquette-2.html`), **sans une trace de vert**, avec une **animation
d'ouverture** en forme de couverture de dossier qui se soulève.

Rien d'autre ne doit bouger dans le dépôt. Les deux maquettes existantes
restent en place : la cliente choisira.

---

## 2. D'où vient cette commande

Le cabinet est réel. **CJ AVOCATS**, dirigé par **Maître Adel JEDDI**, avocat
au Barreau du Val-d'Oise, 63 rue Paul Vaillant-Couturier, 95100 Argenteuil.
Le site vit provisoirement dans le dépôt d'une autre application (Juris Expert)
et en sortira un jour tel quel — voir le § 8.

Deux pistes graphiques ont été soumises :

| | `index.html` — piste A | `maquette-2.html` — piste B |
|---|---|---|
| Couleurs | Vert profond, laiton, papier crème | Papier ivoire, encre, un rouge de robe |
| Structure | Cartes, ombres portées, carrousel | Marge cotée, filets, blanc |
| Bandeau | Aplat vert, portrait en médaillon | Titre éditorial sur papier, tampon CSS |

Verdict de la cliente, mot pour mot : **« Le format initial est plus parlant
mais ta proposition est graphiquement meilleure »**, puis, sur la couleur :
**« Le vert n'est pas terrible. »**

D'où la commande : **la structure de A, l'habillage de B, zéro vert.**

---

## 3. Ce qui vient de A — le déroulé, à conserver intégralement

Reprendre l'ordre des sections de `index.html`, et **tout ce qu'elles
contiennent**. C'est cette richesse qui a été jugée « plus parlante », c'est
elle qu'il ne faut pas perdre en chemin.

1. **Bandeau** — cote (barreau · années · ressort), titre, chapô, deux boutons,
   portrait, puces de juridictions
2. **Trois promesses** — Réactivité · Disponibilité · Suivi attentif
3. **`#delai` — le délai qui court** : 12 situations, fiche détaillée, calcul de
   date, trois précisions jurisprudentielles, bouton qui reporte la situation
   dans le formulaire. **C'est le module qui distingue ce site de tous les
   autres sites d'avocat. Il doit fonctionner, pas seulement s'afficher.**
4. **`#cabinet`** — présentation, signature, puis les 6 prestations
5. **`#domaines`** — 6 fiches (Particuliers / Entreprises) + focus baux
   commerciaux + note sur les cas mixtes, chacune liant sa page de domaine
6. **`#deroule`** — les 4 étapes, du premier échange à l'audience
7. **`#honoraires`** — grille des taux, forfait, protection juridique, AJ
8. **`#avis`** — les 8 avis Google
9. **`#questions`** — les questions fréquentes
10. **`#contact`** — créneaux de rendez-vous + formulaire + coordonnées
11. **Pied de page**, **mot sur les cookies**, **barre d'appel du téléphone**

Le plus simple, et le plus sûr : **partir d'une copie de `index.html`** et n'en
changer que l'habillage. Le JavaScript est entièrement réutilisable tel quel
(délais, créneaux, carrousel, cookies, formulaire, calcul des années
d'exercice). Le réécrire ne ferait qu'introduire des régressions.

---

## 4. Ce qui vient de B — la charte

Ouvrir `maquette-2.html` : tout y est écrit et commenté.

**Palette.** Papier ivoire `#f4f1ea`, encre `#181a1e`, un seul rouge `#8b1c2b`.
Mode sombre : papier `#131417`, encre `#eae6dd`, rouge `#d4707c`.

**La règle du rouge, à tenir absolument.** Il ne décore rien. Il marque le
tampon, les délais qui expirent, les erreurs de formulaire, les précisions
jurisprudentielles. Rien d'autre. Une couleur qui ne veut dire qu'une chose se
remarque ; une couleur décorative ne se voit plus.

**Trois interdits :**
- **pas d'ombre portée** — un filet d'un pixel sépare deux surfaces ;
- **pas d'angle arrondi** — le papier se coupe, il ne se rabote pas ;
- **aucune police téléchargée.** Georgia pour le display, la police du système
  pour le texte, la monospace du système pour les cotes. Ce n'est pas une
  coquetterie : une police appelée sur un serveur tiers prévient ce serveur du
  passage de chaque visiteur. Pour un cabinet d'avocat, c'est une question de
  secret professionnel, pas de performance. Le pied de page l'affirme — il faut
  que ce soit vrai.

**Les signatures à reprendre :**
- **le tampon** — barreau et date de serment, tracé en CSS, incliné de −6,5° ;
- **les cotes** — chaque section numérotée en machine à écrire (`01`, `02`…) ;
- **le sommaire numéroté**, en première page, façon table des matières ;
- **les titres éditoriaux** — sérif, `font-weight:400`, très grands,
  `letter-spacing:-.02em` ;
- **la réglure** du fond, quasi invisible, qui empêche l'aplat d'être mort.

Libre à vous de trouver mieux. Ce sont des propositions, pas un cahier des
charges — la seule contrainte ferme est **l'absence de vert**.

---

## 5. L'animation d'ouverture

Quatre pistes ont été soumises. **La cliente a choisi la deuxième**, en
demandant que les autres restent en réserve.

> **Retenue — « le dossier qui s'ouvre ».** Un aplat encre recouvre l'écran une
> demi-seconde, puis se retire vers le haut comme la couverture d'un dossier
> qu'on soulève, découvrant le titre. Durée totale visée : **1,2 s environ.**

**Le risque a été annoncé à la cliente**, et il vous revient de le neutraliser :
*« une page blanche d'une seconde si le réseau est lent »*. Donc :

- **tout en CSS, pas une ligne de JavaScript.** Une animation qui dépend d'un
  script peut rester bloquée et laisser un écran noir. Une `@keyframes` avec
  `animation-fill-mode:forwards` ne le peut pas ;
- `pointer-events:none` dès le départ : la couverture ne doit jamais intercepter
  un clic, même pendant qu'elle est là ;
- `@media (prefers-reduced-motion:reduce){ … display:none }` : le visiteur qui a
  demandé moins d'animations n'en voit aucune ;
- la couverture doit être **peinte immédiatement** — CSS en ligne dans le
  document, aucune ressource externe à attendre.

**En réserve, à ne pas implémenter maintenant** (la cliente veut pouvoir y
revenir) : le tampon qui s'appose au chargement ; le titre qui s'écrit à la
machine ; les sections qui montent de quelques pixels en entrant à l'écran.

---

## 6. Les données — à recopier, jamais à réinventer

**Aucune de ces valeurs ne se devine.** Elles ont été vérifiées une par une avec
la cliente. Les reprendre à l'identique depuis `index.html`.

| | |
|---|---|
| Cabinet | SELARL **CJ AVOCATS**, capital 10 000 € |
| Avocat | **Maître Adel JEDDI** — Barreau du Val-d'Oise, serment le **7 juin 2004** |
| Adresse | 63 rue Paul Vaillant-Couturier, 95100 Argenteuil |
| Téléphone | **01 34 34 08 82** — `tel:+33134340882` |
| SIREN / SIRET | 751 760 554 / 751 760 554 00012 |
| RCS · APE · TVA | Pontoise 751 760 554 · 69.10Z · FR 52 751 760 554 |
| Taux horaires | Commercial 160 € · Famille 150 € · Immobilier 160 € · Travail 160 € (TTC/h) |
| Aide juridictionnelle | Acceptée dans les quatre matières |

**Les années d'exercice ne s'écrivent nulle part en dur.** Elles se calculent à
partir de la date de serment, dans le script. Le site affichera « 23 ans »
l'an prochain sans que personne n'y touche.

### Les avis — le point le plus sensible du dossier

Les **8 avis** du tableau `AVIS` sont de vraies personnes, recopiées depuis la
fiche Google **sans une retouche** : ni orthographe corrigée, ni phrase coupée,
ni tri favorable. La politique de confidentialité affirme qu'ils sont
« reproduits tels quels ».

- **Copier le tableau `AVIS` par `Ctrl-C`, caractère par caractère.** Une seule
  faute « corrigée » et l'affirmation devient fausse.
- **N'en inventez aucun, sous aucun prétexte, pas même pour remplir une
  maquette.** Un faux avis est une pratique commerciale trompeuse (art. L.121-2
  du code de la consommation) **et** une faute déontologique pour un avocat.
- **Aucune note moyenne** ne doit apparaître : la cliente l'a fait retirer.

### Ce qui n'est toujours pas connu — à laisser surligné

Deux valeurs sont encore fausses et **doivent rester visiblement marquées**
(classe `.tofill` : fond légèrement teinté, soulignement pointillé) :

- **le courriel** — `contact@cjavocats.fr` est déduit du nom de domaine, pas
  vérifié ;
- **l'heure d'ouverture** — seule la fermeture à 20 h est connue (fiche Google).

**N'inventez rien pour combler un trou.** Trois lignes ont déjà été supprimées
du site pour cette raison : la distance à la gare, le stationnement, et
l'accessibilité aux personnes à mobilité réduite. Cette dernière était la plus
grave : l'écrire sans le savoir fait venir quelqu'un devant une marche.

---

## 7. Ce qui est interdit

1. **Aucun copier-coller depuis un autre site d'avocat.** C'est la première
   consigne donnée par la cliente, et la raison en est simple : *« risque
   important qu'un confrère attaque un autre pour plagiat »*. Textes, formules,
   structures d'argumentaire : tout doit être écrit pour ce cabinet-là.
2. **Aucune affirmation invérifiable.** Pas de « premier cabinet du
   Val-d'Oise », pas de taux de réussite, pas de nombre de dossiers traités.
3. **Aucun cookie, aucune mesure d'audience, aucune ressource externe.** Le site
   n'en dépose aucun et le dit ; il faut que ce reste vrai. Le test le vérifie
   (`document.cookie === ''`).
4. **Aucun lien, aucun chemin, aucune mention de Juris Expert** dans le contenu
   servi. Les commentaires du code peuvent l'expliquer, la page non.
5. **Aucun chemin absolu ni remontant** (`/…`, `../…`). Tout est relatif (`./`).
6. **La balise `<meta name="robots" content="noindex, nofollow">`** en tête de
   fichier, comme sur les autres pages.

---

## 8. Le fichier doit rester déplaçable

Le dossier `avocat-aj/` est destiné à sortir du dépôt pour devenir un site
autonome, sans une ligne à réécrire. La maquette doit respecter la même règle :
tous les chemins relatifs, aucune dépendance hors du dossier.

Ne pas l'ajouter à `sw.js` : ce n'est pas encore une page du site.
Ne la lier depuis aucune page.

---

## 9. Vérifier

```bash
node tests/avocat.test.js        # depuis la racine du dépôt
```

Le test ouvre le site dans un vrai Chromium. Il doit rester **entièrement
vert**. Deux gestes à faire dans `tests/avocat.test.js` :

- ajouter `'maquette-3.html'` à la constante **`TOUTES`** (elle vérifie le
  `noindex`, l'autonomie, l'absence du numéro fictif) ;
- ajouter un bloc calqué sur celui de la seconde maquette, en fin de fichier :
  aucune erreur JavaScript, les 12 situations, les 8 avis **identiques à ceux de
  `index.html`** (le test les compare un par un), le calcul de quantième à
  quantième juste (10 février 2026 + 2 ans → **10 février 2028**), et aucun
  débordement horizontal à 360 px de large.

Vérifier aussi, à l'œil, ce qu'un test ne voit pas :

- l'animation d'ouverture ne laisse **jamais** un écran bloqué ;
- le mode sombre du système ne casse ni le tampon ni la couverture ;
- le mode Lecture de Safari se déclenche d'autant plus volontiers que la page
  ressemble à un article. C'est le reproche déjà fait à la piste B. On ne peut
  pas l'interdire côté site, mais une page qui garde des éléments
  d'interface — cartes, boutons, listes — le déclenche moins qu'un long texte
  suivi. À garder en tête en dosant l'héritage de B.

---

## 10. Publier

Branche **`main`** — c'est elle que le site publie. Message de commit en
français, à la voix active, expliquant **pourquoi** et pas seulement quoi.
Mettre à jour `avocat-aj/README.md` : entrée dans l'arborescence du § 1, et une
section qui compare les trois pistes.

Ne pas toucher à `index.html`, `maquette-2.html`, ni au service worker.
