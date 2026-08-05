# Tests

```
node tests/cse.test.js          # règles CSE : seuils, barèmes, calculs
node tests/navigateur.test.js   # la page ouverte pour de vrai dans Chromium
python3 tests/integrite.py      # ce qui est mécaniquement vérifiable
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
   Le seuil de la subvention à 0,22 % est bien testé à 2000 **et** à 2001 :
   il se déclenche *au-delà* de deux mille, pas à deux mille.
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

## 3. `integrite.py` — ce qui est mécaniquement vérifiable

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
