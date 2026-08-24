# D'où viennent les identifiants de version

`legiarti-audit-jx.json` a été relevé par le dépôt **chm75009-sketch/JURISPRUDENCE**,
branche `claude/github-pages-verification-cdzo92`, commit **fa4c204**, et copié ici
tel quel le 24 août 2026.

232 articles, chacun avec son identifiant LEGIARTI et la date à laquelle il a été lu.
180 viennent des captures déjà confirmées de ce dépôt ; 52 ont été lus au relais,
deux fois chacun, lectures concordantes.

`legiarti-audit.json` est la même table, poussée dans ce dépôt le même jour par la
même source. Les deux fichiers ont été comparés avant intégration : table d'articles
et table question → articles sont identiques.

## Pourquoi un identifiant de version

Un article peut être modifié **sans changer de numéro**. Citer « L.4121-3 » ne dit
pas laquelle de ses versions successives a été lue ; `LEGIARTI000045386446` le dit.
L'application affiche les deux, plus la date de lecture, sous chaque question.

## Comment le rattachement est fait

Par **identifiant d'obligation**, jamais par numéro de question. Un numéro se périme
dès que l'ordre change ou qu'une question s'ajoute — et trois se sont ajoutées depuis
le relevé : les deux questions pilotes et la seconde branche du comité central.

Trois sources se cumulent pour une même obligation :

- les articles cités dans son **fondement** (`src`) ;
- l'article qui porte son **seuil** (`s[1]`) — « dès 11 salariés (L.2311-2) » ;
- ceux que le **relevé** lui rattache sans que le libellé les cite : D.4132-1 et
  D.4132-2 pour le registre des dangers graves, L.2242-17 pour la déconnexion,
  L.2411-5 pour les salariés protégés, L.1131-2 pour la formation des recruteurs.

## Ce qui n'y est pas

Six articles cités par l'audit relèvent du code de la sécurité sociale
(L.441-1, L.441-6, L.911-7) ou du code de l'environnement (L.4521-1, L.515-36,
L.593-1). Ils n'ont pas de version relevée, et l'application écrit
« version non relevée » sur la ligne concernée plutôt que de le taire.
