# Tests

```
node tests/cse.test.js
```

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
