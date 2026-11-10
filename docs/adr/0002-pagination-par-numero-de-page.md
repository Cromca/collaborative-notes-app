# ADR-0002 : Paginer GET /notes par numéro de page, dix notes par page

- **Statut** : Proposé
- **Date** : 2026-11-10
- **Décideurs** : équipe notes-app (Cromca, H129hj, Mohand-123), à valider en review

## Contexte

La liste des notes ne doit pas être renvoyée en entier : l'interface affiche une page à la fois, avec des boutons **Précédent** et **Suivant** et l'indication « Page X sur Y ». L'API stocke les notes dans un fichier JSON relu en entier à chaque requête (voir ADR-0001), donc le coût de lecture ne dépend pas de la page demandée.

Le code d'origine paginait déjà par numéro de page, avec une taille fixe de 10, mais avec un décalage d'une page (issue #1, corrigée dans la PR #8) : la page 1 renvoyait la deuxième tranche. La question de fond n'avait jamais été écrite : fallait-il garder ce modèle ?

## Options envisagées

1. **Numéro de page avec taille fixe** (`GET /notes?page=2`, dix notes par page) : simple à comprendre et à tester, permet de sauter directement à une page, et correspond à l'interface « Page X sur Y ». La taille de page n'est pas configurable par le client.
2. **`offset` et `limit` paramétrables** : plus souple (le client choisit la taille), mais deux paramètres à valider, plus de cas limites, et aucun besoin réel aujourd'hui.
3. **Pagination par curseur** (renvoyer l'identifiant de la dernière note vue) : stable quand des notes sont ajoutées ou supprimées pendant la navigation, et adaptée aux gros volumes. Mais impossible de sauter à une page, nécessite un ordre stable et des identifiants ordonnés (nos identifiants sont des UUID, sans ordre), et complique l'interface.
4. **Pas de pagination côté API** (tout renvoyer, paginer dans le front) : le plus simple côté serveur, mais la réponse grossit avec le nombre de notes et le front doit tout charger avant d'afficher quoi que ce soit.

## Décision

`GET /notes?page=N` renvoie dix notes au plus, avec `page` entier supérieur ou égal à 1 (défaut : 1). Une valeur invalide (`0`, texte, décimal) répond `400`. Le nombre total de notes est dans l'en-tête `X-Total-Count`, que le front utilise pour calculer le nombre de pages. La recherche (`/search`) n'est pas paginée : elle renvoie toutes les notes dont le titre correspond.

## Conséquences

- ✅ Contrat très simple, couvert par des tests (pages 1, 2 et au-delà, valeurs invalides).
- ✅ L'interface peut afficher « Page X sur Y » et désactiver **Précédent** et **Suivant** aux extrémités, grâce à `X-Total-Count`.
- ✅ La création d'une note renvoie aussi `X-Total-Count` : le front peut aller directement à la dernière page, même si sa liste n'est pas encore chargée.
- ⚠️ La taille de page (10) est écrite à deux endroits : dans l'API et dans le calcul du nombre de pages du front. Si l'une change sans l'autre, le front affichera un mauvais nombre de pages.
- ⚠️ Si une note est ajoutée ou supprimée pendant que quelqu'un navigue, une note peut être vue deux fois ou sautée d'une page à l'autre : acceptable pour un usage local à une seule personne, pas pour plusieurs utilisateurs.
- ⚠️ L'en-tête `X-Total-Count` doit être exposé par la configuration CORS (`exposedHeaders`), sinon le navigateur ne le lit pas.
- ⚠️ La recherche renvoie toutes les correspondances sans pagination : à revoir si le nombre de notes grossit, en même temps que le stockage (ADR-0001).
