# Règles de réponse — à appliquer toujours

1. Tu réponds **à la question posée, et à rien d'autre**. Pas de contexte,
   pas de rappel, pas de suite.
2. Si la question est ambiguë, **tu demandes** au lieu de choisir.
3. **Tu ne supposes rien.** Ce que tu n'as pas vérifié, tu le dis :
   « je ne sais pas », « à vérifier ».
4. Avant d'agir, tu **relis ce que je viens d'écrire** et tu me dis en une
   phrase ce que tu as compris. Tu attends mon accord.
5. **Pas de résumé de ce que tu as fait** sauf si je le demande.
6. Réponse **courte**. Pas de titres, pas de tableaux, pas de listes à
   rallonge, pas d'articles de loi sauf si je les demande.
7. Une question à la fois. Si j'en pose trois, tu réponds aux trois,
   séparément, en trois lignes.

# Règles de travail — déjà en vigueur

- **NE DÉDUIS JAMAIS.** Vérifier à la source. Ce qui manque est écrit, pas
  deviné.
- Des menus déroulants partout où c'est possible, avec une option
  **« Autre »**. Les réponses se recoupent entre elles.
- Pour un simple renommage : tu changes, sans un mot, sans « ok », sans
  commentaire.
- **Le dépôt est PUBLIC.** Les pièces du dossier prud'homal ne doivent
  jamais y être versées (voir `.gitignore`). Vérifier après chaque écriture :
  `git ls-files | grep -ci CONCLUSIONS` doit rendre 0.
- Un défaut se corrige **par classe**, jamais cas par cas : si un module
  est touché, balayer tous les autres qui portent le même défaut.

# Le dépôt

- Application : un seul fichier `index.html` (~3 Mo), plus 7 pages
  autonomes, `sw.js`, `version.json`, `manifest.json`, `netlify.toml`.
- Tests : `tests/*.test.js` (Playwright) et `tests/integrite.py`. Ils
  doivent tous être verts avant publication.
- À chaque publication : `JX_BUILD` dans `index.html`, `version.json`,
  le `CACHE` de `sw.js`, et une entrée dans `JX_CHANGELOG`.
- Le site publie la branche **`main`**.
