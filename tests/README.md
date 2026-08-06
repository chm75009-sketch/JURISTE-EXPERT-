# Tests

```
node tests/cse.test.js            # règles CSE : seuils, barèmes, calculs
node tests/budgets.test.js        # les budgets : des euros, au centime
node tests/navigateur.test.js     # la page ouverte pour de vrai dans Chromium
node tests/cloisonnement.test.js  # un dossier client ne déborde pas sur un autre
node tests/accueil.test.js        # l'écran d'accueil : ordre de lecture et lisibilité
node tests/familles.test.js       # les cinq familles de l'application
node tests/secteur.test.js        # changer de secteur partout, sauf si le code le verrouille
node tests/garde.test.js          # l'admin reste l'admin, l'effectif d'abord, le retour partout
node tests/retour.test.js         # AUCUNE page sans retour — les 42 sont ouvertes et vérifiées
node tests/fiche.test.js          # la fiche entreprise suit le secteur choisi, secteur par secteur
node tests/presentation.test.js   # la mise en page, mesurée en pixels sur un téléphone
node tests/seuils.test.js         # tous les seuils d'effectif, et les modules qui s'y adaptent
node tests/dossier.test.js        # les pièces de chaque étape, avec leur article
node tests/harcelement.test.js    # harcèlement moral : chaque réponse, son arrêt
python3 tests/integrite.py        # ce qui est mécaniquement vérifiable
```

## 1. `cse.test.js` — les règles

Ces tests existent pour un défaut précis, qui s'est répété : dans les modules
CSE, **le message affiché et le calcul qui l'applique sont écrits à deux
endroits différents**. Rien n'empêche l'un de dire « la clause est écartée »
pendant que l'autre garde la valeur de la clause. C'est arrivé trois fois —
sur le calendrier des réunions, sur la périodicité des consultations, et sur
le décompte des votes.

Ce que la suite vérifie :

1. **Les bornes de seuil, des deux côtés** — 10/11, 49/50, 299/300, 999/1000,
   1999/2000. C'est la seule façon de voir un `>=` écrit à la place d'un `>`.
   Le seuil de la subvention à 0,22 % est testé à 1999, **2000** et 2001 :
   l'article L.2315-61 vise les entreprises « d'au moins deux mille
   salariés », donc il se déclenche **à** deux mille. Ce test disait
   l'inverse, et trois endroits du code le suivaient : à 2 000 salariés
   pile, l'application annonçait 0,20 % au lieu de 0,22 %.
2. **Message contre comportement** — chaque alerte qui annonce une conséquence
   est suivie d'une assertion sur la fonction qui l'applique.
3. **Le barème R.2314-1**, tranche par tranche, y compris la dernière
   (10 000 et plus).
4. **Les exclusions de L.1111-3** — apprentis, contrats de
   professionnalisation — et le prorata du temps partiel.
5. **La stabilité des identifiants de tâche** : une tâche cochée doit le
   rester d'une session à l'autre.
6. **La couverture du guide** : le plan d'un groupe de 5 000 salariés doit
   mentionner la commission sécurité, les commissions de 300, la commission
   économique, les 0,22 %, les sites, le groupe, l'instance européenne et les
   administrateurs salariés.
7. **La lisibilité** : aucune alerte sans titre, aucune première phrase
   au-delà de 200 caractères.

À lancer après **toute** modification d'un module CSE.

## 2. `navigateur.test.js` — ce que le client voit

Lire le code ne suffit pas : trois défauts récents ne se voyaient qu'à
l'écran. Ce test ouvre `index.html` dans Chromium et vérifie, en conditions
réelles :

- **aucune exception JavaScript** de l'ouverture jusqu'à la dernière page CSE
  (les erreurs réseau sont ignorées : hors ligne, la sauvegarde en ligne
  échoue normalement) ;
- **sans secteur choisi**, l'en-tête écrit « Convention non renseignée » et
  non « CCN IDCC 0016 » — c'est exactement le défaut signalé sur le compte
  administrateur ;
- **secteur Banque**, l'en-tête passe à IDCC 2120 et le questionnaire de
  conformité cesse de poser des questions sur les cartes de conducteur, le
  tachygraphe et les frais de casse-croûte ;
- **secteur Transport**, ces mêmes questions reviennent, GAR comprise ;
- les huit pages du CSE s'ouvrent l'une après l'autre sans erreur.

Playwright n'est pas une dépendance du projet. S'il est absent, le test le
dit et sort en succès. Pour l'activer : `npm i playwright`.

## 3. `budgets.test.js` — des euros, au centime

Ce module calcule de l'argent dû. Un taux appliqué au mauvais palier, un
plafond de transfert mal arrondi, et ce sont des euros réclamés à tort ou
jamais réclamés. Chaque assertion porte donc sur un montant, pas sur une
phrase :

- le taux à 49, 50, 1 999, **2 000** et 2 001 salariés — le seuil de
  0,22 % s'applique **à** deux mille, pas au-delà ;
- 0,20 % de 3 000 000 € = 6 000 € ; versé 5 000 € → il manque exactement
  1 000 €, et ce montant doit apparaître dans l'alerte ;
- l'effet de cliquet des activités sociales : 1,100 % en 2024, 1,000 % en
  2025 → il faudrait 33 000 € ;
- les plafonds de transfert : 10 % de l'excédent, dans les deux sens ;
- le régime comptable à 153 000 € (seuil **inclus**), puis à deux des trois
  seuils de L.2315-73 ;
- et, en négatif : sans exercice précédent, aucun cliquet n'est supposé ;
  ressources inconnues, aucun régime n'est affirmé.

## 4. `cloisonnement.test.js` — un dossier ne déborde pas sur un autre

C'est le test le plus important du lot, parce que le défaut qu'il garde était
le plus grave : un cabinet ouvre plusieurs dossiers clients depuis le même
navigateur, et le client précédent restait affiché — son nom en en-tête, sa
convention collective, son dirigeant au bas des documents — y compris après
déconnexion et reconnexion avec un autre compte.

Trois données étaient rattachées à l'appareil au lieu du compte : la fiche
entreprise (`juris_transport`), le secteur (`app_secteur` et ses variantes
par module), et le code client (`jte_code`, que la déconnexion n'effaçait
pas — la sauvegarde en ligne se reconnectait donc toute seule au dossier
précédent).

Le test joue le parcours complet : on ouvre un dossier client, on remplit la
fiche **par l'application elle-même**, on se déconnecte, on revient en
administrateur — rien du client ne doit subsister — puis on retourne dans le
dossier client, qui doit tout retrouver intact.

**Et un dossier par secteur d'essai.** Signalé ensuite : « je suis dans
assurance, il vient d'où cet effectif de 72 ? ». Il venait du registre du
personnel — 83 inscrits — saisi en essayant un autre secteur. Le compte du
cabinet ne désignait qu'un seul dossier quel que soit le secteur ouvert :
`jxCompte()` renvoyait `admin`, donc `rxKey()`, `socKey()`, `csedKey()` et
`jxEntKey()` pointaient tous au même endroit. Changer de secteur changeait la
convention citée, pas le dossier.

Le test joue donc la scène : trois salariés sur Banque → on passe à
Assurances → registre vide, effectif nul, fiche vide → on revient sur Banque
→ les trois sont là. Il vérifie aussi que l'effectif **nomme sa source** (le
registre, avec le nombre d'inscrits) et le dossier ouvert : un chiffre sans
origine ne vaut rien, et c'était exactement la question posée.

## 5. `harcelement.test.js` — chaque réponse, son arrêt

Ce module dit à un salarié si sa situation entre dans la qualification de
harcèlement moral. Une réponse fausse l'envoie au conseil de prud'hommes
pour rien, ou l'en dissuade à tort. Le test vérifie donc, pour chaque
réponse possible, **ce que le module affirme et l'arrêt qu'il cite** :

- fait unique → exclu, arrêt du 22 janvier 2014 ;
- même fait répété → suffit, arrêt du 26 janvier 2016 — et le module ne dit
  pas en même temps l'inverse ;
- deux faits distincts → suffisent, arrêt du 11 mars 2025 ;
- auteur sans lien hiérarchique → aucun lien de subordination requis,
  Pont du Gard ;
- politique d'entreprise → harcèlement institutionnel, France Télécom ;
- enregistrement clandestin → recevable sous conditions, assemblée plénière
  du 22 décembre 2023 ;
- prévention sans réaction, ou enquête seule → l'employeur ne s'exonère pas.

Et les confrontations entre réponses : fait unique déclaré sur plusieurs
mois, politique d'entreprise attribuée à un collègue, prévention sans
réaction. Le test contrôle aussi que les onze entrées CSE du menu figurent
sur l'accueil et qu'aucune carte de l'accueil ne mène à une page absente.

## 6. `dossier.test.js` — les pièces de chaque étape

Ce module dit à un employeur ce qu'il doit avoir sur la table. Une pièce
oubliée dans la liste, et c'est une réunion à refaire — ou une élection
annulable. Le test contrôle la **présence effective** de chaque pièce clé
avec son article, en prenant pour cas type la réunion de négociation du
protocole préélectoral : liste des électeurs et ses conditions (L.2314-18),
liste des éligibles et les siennes (L.2314-19), assimilés employeur
électeurs mais non éligibles, proportion femmes-hommes (L.2314-30), nombre
de sièges (R.2314-1), les deux répartitions (L.2314-13), mis à disposition
(L.2314-23), vote électronique (L.2314-26).

Il vérifie aussi les délais annoncés (90 jours, 15 jours, 3 jours), les
numéros de formulaire officiels, le filtrage par effectif (8 / 30 / 50 /
300 salariés), la stabilité des identifiants de pièce — une case cochée
doit le rester — et l'absence de doublon d'identifiant sur les quinze
étapes.

## 7. `accueil.test.js` — l'écran d'accueil

C'est la première chose qu'un client voit. Le diagnostic reprochait trois
choses ; le test vérifie qu'elles ne peuvent pas revenir :

- **l'ordre de lecture** : bannière → « Que voulez-vous faire ? » → modules
  de démonstration → pied de page. Si un bloc repasse devant, le test tombe ;
- **les fenêtres d'accès** ne remplacent plus la page : l'accueil reste
  affiché derrière, la croix existe, Échap referme, le défilement est rendu ;
- **aucune référence d'article** sur l'écran d'accueil — la recherche est
  faite sur le texte rendu, pas sur le code ;
- **la lisibilité réelle** : le rapport de contraste de chaque titre, chaque
  puce et chaque bouton est calculé et doit dépasser 4,5:1.

Ce dernier point n'est pas décoratif. Les six blocs avaient d'abord été
écrits avec les couleurs du thème sombre sur une page qui est claire :
du crème pâle sur du crème. Structure impeccable, texte invisible — aucun
test de structure ne l'aurait vu.

## 8. `fiche.test.js` — la fiche entreprise suit le secteur choisi

Défaut signalé depuis un téléphone : secteur **Bâtiment** choisi, et
l'application affichait quand même « Activité principale : Transport routier
de marchandises ». Ce n'était pas une étiquette à corriger — toute la fiche
était écrite pour le transport : les exemples (`SARL TRANSPORT EXPRESS`,
`contact@transport.fr`), la liste des activités, celle des organisations
patronales, la licence communautaire, le gestionnaire de transport, la DREAL,
la caisse CARCEPT.

Ce test **n'a pas de liste écrite à la main**. Il lit `SEC_LISTE`, choisit
chaque secteur l'un après l'autre, et exige qu'aucun mot propre à un autre
secteur ne subsiste — sur l'écran d'inscription puis sur la page Paramétrage.
Un secteur ajouté demain sera vérifié sans qu'on touche au test.

Il contrôle aussi ce qui n'est **pas** décidé à la place du client : une
activité non choisie reste vide (et non « transport de marchandises »), une
organisation patronale non choisie reste vide (et non « FNTR »), un effectif
non renseigné reste vide (et non « moins de 11 »). Chaque liste se termine par
« Autre — préciser ». Et changer de secteur ne fait rien disparaître en
silence : une activité devenue étrangère bascule visiblement sur « Autre »,
avec son champ libre ouvert.

Enfin, une seule carte d'autorisations est visible à la fois : licence et
gestionnaire de transport pour le transport, carte BTP / caisse de congés
payés / décennale pour le bâtiment, et une note explicite pour les secteurs
qui n'en ont pas — plutôt qu'une carte qui ne les concerne pas.

## 9. `presentation.test.js` — la mise en page, en pixels

« Très mauvaise présentation. Brouillon. » Le balisage était correct :
aucun test de structure n'aurait vu ces défauts. Celui-ci mesure des pixels
sur un écran de téléphone (390 × 844), page par page.

Ce qu'il a fallu corriger, et ce qu'il garde :

- **le titre de l'application** ne disposait que de 82 px et se cassait sur
  **trois lignes**, écrasé par le bouton de secteur écrit en toutes lettres
  juste à côté. Le test exige une seule ligne, au moins 150 px, non tronquée,
  et un en-tête sous 80 px de haut ;
- **`[ENTREPRISE]`** — le texte de remplacement des documents — était
  enregistré dans la fiche et s'affichait dans l'en-tête ;
- **une seule barre de titre par page** : 41 pages sur 43 en ont une, et
  l'en-tête global s'empilait par-dessus. Le test ouvre les 43 pages et
  compte ;
- **le bouton flottant ne recouvre ni bouton ni titre** : il masquait le
  texte, et jusqu'au bouton « Générer le code ». Le test descend en bas de
  chaque page et cherche une intersection ;
- **aucun débordement en largeur**, sur aucune page ;
- **les cartes d'une même rangée ont la même hauteur**, et leur étiquette ne
  déborde pas ;
- **une famille seule sur sa ligne prend toute la largeur** — la cinquième
  restait à moitié de largeur ;
- **le bandeau d'effectif** écrivait « Votre effectif n'est pas
  connu**C'est lui qui commande le reste** » : deux phrases collées, faute
  d'un `display:block`.

Il vérifie aussi qu'**une seule chose annonce le secteur actif**. Le badge
disait « tous secteurs » pendant que l'en-tête affichait « CCN IDCC 1516 » :
deux lectures différentes de la même donnée, et le doute pour l'utilisateur.

## 10. `seuils.test.js` — tous les seuils, et l'application qui s'y adapte

La liste d'effectif proposée à la création du dossier s'arrêtait à **« 250
salariés et plus »**. Au-dessus, le droit du travail continue de compter :
300, 500, 750, 1 000, 2 000, 5 000, et le barème du nombre d'élus
(R.2314-1) monte jusqu'à **10 000**.

Le test contrôle **38 obligations, seuil par seuil et article par article** —
du document unique (R.4121-1) à la dernière tranche du barème. Un seuil qui
disparaîtrait du tableau, ou un article qui changerait, le fait tomber.

Il garde aussi ce que le tableau ne doit pas confondre :

- **deux règles de franchissement distinctes, portées obligation par
  obligation et non seuil par seuil** — au même seuil de 50, le règlement
  intérieur suit les *douze mois* (L.1311-2 renvoie expressément à L.2312-2)
  tandis que la participation, le FNAL et l'effort de construction suivent
  les *cinq années civiles* (L.130-1 c. séc. soc., depuis la loi PACTE). Les
  regrouper par seuil revenait à donner l'une pour l'autre : le test vérifie
  sept obligations, ligne par ligne ;
- **ce qui n'est pas en vigueur** n'est pas présenté comme une obligation :
  le seuil de 100 salariés de la directive (UE) 2023/970 figure à part, sa
  transposition française n'étant pas publiée à ce jour ;
- **les tranches se suivent** sans trou ni chevauchement, une par seuil.

Puis le tri qui en découle. À 9 salariés, les huit modules qui supposent un
comité sont mis de côté ; à 11, les élections reviennent ; les consultations
récurrentes et les budgets attendent 50. Deux garde-fous :

- « Mon effectif et mes seuils » et « Où en suis-je ? » **restent toujours
  visibles** — ce sont eux qui répondent à la question du seuil ;
- **effectif inconnu, rien n'est masqué** : l'application ne suppose pas.

Et le test vérifie que dès que le registre du personnel est tenu, c'est lui
qui fait foi : l'effectif est calculé (L.1111-2, L.1111-3), la tranche
déclarée ne sert plus — même si elle annonce 5 000 salariés.

## 10. `integrite.py` — ce qui est mécaniquement vérifiable

Sept contrôles sur le fichier lui-même, sans l'exécuter : fonctions déclarées
deux fois, fonctions appelées depuis un `onclick` sans exister, `goPage()`
vers une page absente, `getElementById()` sur un identifiant jamais écrit,
valeurs de secteur en dur, `onclick` construit avec une valeur non échappée,
écritures dans le stockage du navigateur dont l'échec est avalé.

C'est ce contrôle qui a mis au jour deux modules entiers — l'ancienne
jurisprudence et l'ancienne veille réglementaire — qui remplissaient des
conteneurs inexistants, et le secteur « transport » écrit en dur comme
valeur par défaut de toute l'application.

Deux points qu'il signale sont des faux positifs connus, à ne pas
« corriger » :

- les fonctions homonymes (`esc`, `load`, `save`, `render`…) sont locales à
  leur module et ne s'écrasent pas ;
- `doc-fullscreen-overlay` est créé par `overlay.id = '…'`, il n'apparaît
  donc dans aucun attribut `id="…"`.
