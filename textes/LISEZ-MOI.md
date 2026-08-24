# Les identifiants de version des articles cités par l'audit

`legiarti-audit.json` rattache à chacun des 232 articles cités par les 165
questions de l'audit son identifiant de version — le `LEGIARTI` — et la date à
laquelle il a été lu.

## Pourquoi

Un article peut être modifié sans changer de numéro. « L.2314-33 » ne dit pas
laquelle de ses versions successives a été lue ; `LEGIARTI000052437191` le dit.
Un contre-audit qui reproche une citation tronquée se règle en une ligne quand
l'identifiant est là, et coûte plusieurs requêtes datées quand il manque.

## Ce que le fichier contient

```
articles       numéro d'article → { id, date, lectures }
par_question   n° de question   → [ numéros d'articles cités ]
```

`lectures` est le nombre de lectures concordantes obtenues : le relais Légifrance
sert parfois un article homonyme d'une autre partie du code, une seule lecture ne
prouve donc rien. Aucun identifiant retenu ici n'a moins de deux lectures
concordantes.

## Comment il a été établi

Relais Légifrance de l'application, action « article », champ `code` valant
**« Code du travail »** — le NOM du code, jamais un `LEGITEXT` : un `LEGITEXT`
désactive le filtre et la recherche par pertinence sert alors des homonymes
d'autres codes.

180 identifiants proviennent des captures déjà confirmées du dépôt JURISPRUDENCE,
52 ont été lus au relais le 23 août 2026.

## À refaire quand

À chaque fois qu'une question change d'article, et à chaque date d'audit
nouvelle : l'identifiant vaut pour la date de lecture, pas pour toujours.
