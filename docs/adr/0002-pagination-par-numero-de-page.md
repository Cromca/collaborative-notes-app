# ADR-0002 : Paginer GET /notes par numéro de page, dix notes par page

- **Statut** : Accepté
- **Date** : 2026-11-10
- **Validation** : proposition de Mohand-123, revue et intégration par Cromca dans la PR #23.

## Contexte

La liste des notes ne doit pas être renvoyée en entier : l'interface affiche une page à la fois, avec des boutons **Précédent** et **Suivant** et l'indication « Page X sur Y ». L'API stocke les notes dans un fichier JSON relu en entier à chaque requête (voir [ADR-0001](0001-stockage-fichier-json.md)), donc le coût de lecture ne dépend pas de la page demandée.

Le code d'origine paginait déjà par numéro de page, avec une taille fixe de 10, mais avec un décalage d'une page (issue #1, corrigée dans la PR #8) : la page 1 renvoyait la deuxième tranche. La question de fond n'avait jamais été écrite : fallait-il garder ce modèle ?

## Options envisagées

1. **Numéro de page avec taille fixe** (`GET /notes?page=2`, dix notes par page) : simple à comprendre et à tester, permet de sauter directement à une page, et correspond à l'interface « Page X sur Y ». La taille de page n'est pas configurable par le client.
2. **`offset` et `limit` paramétrables** : plus souple (le client choisit la taille), mais deux paramètres à valider, plus de cas limites, et aucun besoin réel aujourd'hui.
3. **Pagination par curseur** : reprend après une position dans un ordre stable, sans dépendre d'un numéro de page. Le curseur est opaque pour le client ; les UUID n'empêchent pas ce modèle et ne doivent pas nécessairement être chronologiques. Il faudrait définir un ordre et un repère stables, ainsi que le comportement si la note repère est supprimée. Ce modèle limite les décalages liés aux suppressions précédentes, mais ne fournit pas directement l'accès à une page numérotée. Avec notre fichier JSON, il ne supprimerait pas la lecture complète du fichier.
4. **Pas de pagination côté API** (tout renvoyer, paginer dans le front) : le plus simple côté serveur, mais la réponse grossit avec le nombre de notes et le front doit tout charger avant d'afficher quoi que ce soit.

## Décision

`GET /notes?page=N` renvoie dix notes au plus, avec `page` entier supérieur ou égal à 1 (défaut : 1). Une valeur invalide (`0`, texte, décimal) répond `400`. Les notes suivent l'ordre du tableau JSON ; les créations sont ajoutées à la fin. Une page au-delà de la dernière renvoie un tableau vide avec le total inchangé. Le nombre total de notes est dans l'en-tête `X-Total-Count`, que le front utilise pour calculer le nombre de pages. La recherche (`/search`) n'est pas paginée : elle renvoie toutes les notes dont le titre correspond.

## Conséquences

- ✅ Contrat très simple, couvert par des tests (pages 1, 2 et au-delà, valeurs invalides).
- ✅ L'interface peut afficher « Page X sur Y » et désactiver **Précédent** et **Suivant** aux extrémités, grâce à `X-Total-Count`.
- ✅ La création d'une note renvoie aussi `X-Total-Count` : le front peut aller directement à la dernière page, même si sa liste n'est pas encore chargée.
- ⚠️ La taille de page (10) est écrite à deux endroits : dans l'API et dans le calcul du nombre de pages du front. Si l'une change sans l'autre, le front affichera un mauvais nombre de pages.
- ⚠️ Une suppression dans une page déjà parcourue décale les notes suivantes et peut faire sauter une note lors du passage à la page suivante. Les ajouts actuels se font en fin de liste et ne décalent pas les notes existantes. Cette limite est acceptable pour l'usage local prévu, mais doit être réévaluée pour un usage partagé.
- ⚠️ L'en-tête `X-Total-Count` doit être exposé par la configuration CORS (`exposedHeaders`), sinon le navigateur ne le lit pas.
- ⚠️ La recherche renvoie toutes les correspondances sans pagination : à revoir si le nombre de notes grossit, en même temps que le stockage (ADR-0001).

## Référence

Le principe de curseur opaque et d'ordre cohérent est décrit dans la [spécification GraphQL Cursor Connections](https://relay.dev/graphql/connections.htm). Cette référence éclaire l'alternative ; l'API de notes-app reste une API REST sans GraphQL.
