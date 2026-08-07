# Fichier du personnel fictif — pour éprouver l'application

`PERSONNEL_FICTIF_BANQUE.csv` (et le même en `.xlsx`) — **250 salariés,
tous inventés.** Aucune
personne réelle, aucune donnée réelle. Entreprise de banque, IDCC 2120.

## Où l'importer

Accueil → tuile **Personnel** (Espace RH) → onglet **Registre** →
**« 📥 Importer un fichier »** → choisir **REMPLACER**.

Puis, pour voir ce qu'il déclenche :

- **Menu ☰ → BDESE — base de données** (ou accueil → Le CSE → *Informer le
  comité*) ;
- **Menu ☰ → Index égalité femmes-hommes** ;
- **Accueil → Mon effectif et mes seuils** ;
- **Le CSE → Organiser les élections** (collèges et parité).

## Ce que le fichier est fait pour déclencher

**Les seuils.** 250 salariés : le seuil des **cinq** indicateurs de l'index
est atteint (au lieu de quatre en dessous de 250). 66 cadres : le troisième
collège se déclenche (au moins vingt-cinq). En dessous de 300, les
sous-rubriques supplémentaires de R.2312-9 ne s'affichent pas — c'est
normal, et l'écran l'annonce rubrique par rubrique.

**Les exclusions de l'index.** Un apprenti, un contrat de
professionnalisation, un intérimaire et un stagiaire doivent être écartés,
chacun avec son motif écrit. Trois salariés présents moins de six mois sur
2025 aussi, et un salarié sorti avant la période.

**Ce qui manque doit être DIT, jamais deviné.** Un salarié sans sexe, un
sans date de naissance, un sans statut, un sans date d'entrée, un sans
salaire. Aucun ne doit être compté à zéro ; tous doivent être nommés.

**Le temps partiel.** Douze salariés à 50, 60, 80 et 90 %, dont un cadre,
et une quotité écrite en fraction décimale (0,4). La rémunération doit être
signalée comme à reconstituer en équivalent temps plein.

**Les groupes de comparaison.** Chez les cadres de 40 à 49 ans, quatre
femmes et quatre hommes avec un écart marqué en faveur des hommes. Chez les
employés de moins de 30 ans, l'écart est inversé : l'index doit conserver
le SIGNE. Un groupe de techniciens de 50 ans et plus ne compte que deux
femmes : il doit être écarté comme non valide.

**Les dix plus hautes rémunérations.** Un comité de direction de huit
personnes, deux femmes et six hommes.

**Les noms qui cassent les découpages.** `D'ANGELO`, `N'DIAYE`,
`LE GOFF`, `VAN DEN BERGHE`, `MÜLLER-SCHMIDT`, `DA SILVA PEREIRA`,
prénoms composés, trémas et accents.

**Les civilités à la place du sexe.** `Mme`, `M`, `Femme`, `Homme` —
« Mme » ne doit pas être lu comme un homme.

**Les montants à la française.** `5 480,00`, `2 640,75` — espace des
milliers et virgule décimale.

## Ce que l'application doit refuser de calculer

À l'import, l'effectif reste **non calculé** : les contrats à durée
déterminée attendent la réponse à « remplace-t-il un salarié absent ? »
(L.1111-2, 2°) et un salarié n'a pas de date d'entrée. C'est voulu.
L'application doit le dire et nommer ce qui manque, au lieu d'annoncer un
chiffre faux. Répondez dans **Mon effectif et mes seuils** pour débloquer
le calcul.

## Colonnes

| Colonne | Utilisée par |
|---|---|
| Nom, Prénom | registre, élections, index |
| Sexe | index, parité des listes (L.2314-30) |
| Date de naissance | tranches d'âge de l'index, éligibilité |
| Nationalité, Titre de séjour | registre unique (D.1221-23) |
| Date d'entrée, Date de sortie | effectif, ancienneté, électorat |
| Type de contrat | effectif (L.1111-2, L.1111-3), exclusions de l'index |
| Statut | collèges, catégories socioprofessionnelles de l'index |
| Emploi | registre, fiches |
| Temps de travail | effectif au prorata, alerte équivalent temps plein |
| Salaire mensuel brut | pré-remplissage de l'index |
| Coefficient | index par niveaux de la convention (D.1142-2, 1°) |
| Observations | registre |

Les niveaux A à K sont **fictifs**. Confrontez-les à la grille réelle de la
convention avant tout usage autre qu'un test.
