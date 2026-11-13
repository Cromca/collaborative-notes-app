# ADR-0002 : Paginer GET /notes par numéro de page

- **Statut** : Accepté
- **Date** : 2026-11-13
- **Auteur** : Hugo
- **Issue** : #34

## Contexte

`GET /notes` renvoie la liste des notes affichée par le front. Au départ, la pagination était décalée : la page 1 sautait les 10 premières notes (issue #1, corrigée par la PR #8). Avant d'aller plus loin, il faut écrire comment on pagine et ce que ça implique pour le front.

Contraintes :

- quelques centaines de notes au plus, stockées dans un fichier JSON relu à chaque requête (voir ADR-0001) ;
- le front affiche une page de 10 notes avec des boutons Précédent / Suivant et le nombre total de notes ;
- après la création d'une note, le front doit afficher la page où elle se trouve ;
- la recherche (`GET /search`) et le filtre par tag (`GET /notes/by-tag/:tag`) renvoient peu de résultats.

## Options envisagées

### Option A : numéro de page (`?page=1`, 10 par page)

L'API découpe la liste : la page `n` contient les notes `(n - 1) × 10` à `n × 10 - 1`. Le total est renvoyé dans l'en-tête `X-Total-Count`.

- ➕ Simple à coder et à tester, côté API comme côté front
- ➕ On peut aller directement à n'importe quelle page et afficher « page 2 sur 5 »
- ➕ Le lien `?page=3` est lisible et facile à tester au `curl`
- ➖ Si une note est ajoutée ou supprimée pendant qu'on navigue, une note peut apparaître sur deux pages ou être sautée
- ➖ Il faut valider `page` (0, négatif, texte) : erreur source du bug #1

### Option B : curseur (`?after=<id>&limit=10`)

L'API renvoie les 10 notes qui suivent un identifiant donné, et le curseur de la page suivante.

- ➕ Pas de doublon ni de note sautée quand la liste change
- ➕ Reste rapide sur de très grandes listes avec une base de données
- ➖ Pas d'accès direct à la page 4, ni de « page X sur Y » : seulement Suivant (et Précédent si on garde un historique de curseurs)
- ➖ Il faut un curseur qui résiste aux suppressions : les notes gardent l'ordre d'insertion du tableau (les nouvelles sont ajoutées à la fin), donc l'identifiant de la dernière note vue peut servir de curseur sans ordre supplémentaire, mais si cette note est supprimée entre deux requêtes, le curseur ne retrouve plus sa position
- ➖ Plus compliqué à coder et à tester pour un gain nul avec quelques centaines de notes

### Option C : pas de pagination côté API

`GET /notes` renvoie tout, le front découpe en pages.

- ➕ Le plus simple côté API
- ➖ La réponse grossit avec chaque note, même si l'utilisateur ne regarde que la première page
- ➖ La logique de pagination part dans le front et n'est plus testée par les tests de l'API

## Décision

On garde **l'option A, la pagination par numéro de page** :

- `GET /notes?page=n`, pages qui commencent à **1**, `page` absente = page 1 ;
- **10 notes par page**, valeur fixe (pas de paramètre `size` pour l'instant) ;
- `page` qui n'est pas un entier ≥ 1 → **400** avec un message d'erreur ;
- nombre total de notes dans l'en-tête **`X-Total-Count`**, exposé au navigateur par CORS ;
- `POST /notes` renvoie aussi `X-Total-Count`, le nombre total de notes après la création : comme la nouvelle note est ajoutée en dernier, c'est aussi sa position, ce qui permet au front d'aller sur la bonne page.

`GET /search` et `GET /notes/by-tag/:tag` ne sont pas paginés. Une page au-delà de la dernière n'est pas une erreur : l'API répond `200` avec un tableau vide et le bon `X-Total-Count`, c'est le front qui revient alors à la page 1.

## Conséquences

Pour l'API :

- ➕ Le calcul tient en une ligne (`(page - 1) * size`) et il est couvert par les tests.
- ➖ La validation de `page` doit rester stricte, sinon on retombe sur le décalage de l'issue #1.

Pour le front :

- ➕ Il calcule le nombre de pages avec `Math.ceil(total / 10)` et affiche Précédent / Suivant.
- ➕ Après un ajout, il va sur la page `Math.ceil(X-Total-Count / 10)`, là où se trouve la nouvelle note.
- ➖ La taille de page (10) est écrite à deux endroits, dans `api/app.js` et `web/src/App.jsx` : la changer d'un côté sans l'autre casse l'affichage.
- ➖ Si la page demandée dépasse la dernière (après des suppressions), le front revient à la page 1.
- ➖ En mode recherche, toutes les notes trouvées arrivent d'un coup et le total est simplement leur nombre.

## Quand revoir cette décision

Si les notes passent dans une base de données (voir ADR-0001) et dépassent quelques milliers, ou si plusieurs personnes modifient la liste en même temps, passer à une pagination par curseur (option B) dans un nouvel ADR.
