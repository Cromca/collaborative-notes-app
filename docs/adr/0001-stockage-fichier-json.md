# ADR-0001 : Stocker les notes dans un fichier JSON

- **Statut** : Accepté
- **Date** : 2026-11-10
- **Validation** : proposition de Mohand-123, revue et intégration par Cromca dans la PR #22.

## Contexte

notes-app est une application pédagogique, utilisée en local par une seule personne à la fois, sans authentification. Le code d'origine du module stocke déjà les notes dans `api/notes.json`. Le projet doit s'installer et se lancer avec Node.js et npm seulement, sans service externe : c'est la promesse du README (installation en quelques commandes). Le volume attendu est de quelques dizaines à quelques centaines de notes, de 20 000 caractères au plus chacune.

Les corrections de la PR #12 ont dû en gérer les faiblesses : identifiants dupliqués après une suppression (issue #2), puis, en passant à des écritures asynchrones, mise en file des écritures et remplacement atomique du fichier. Il faut donc écrire noir sur blanc pourquoi on garde ce choix, et à quelles conditions.

## Options envisagées

1. **Fichier JSON** (module `fs` de Node.js) : aucune dépendance, lisible à l'œil, facile à réinitialiser. En contrepartie, le fichier est relu et réécrit en entier, et la cohérence en cas d'écritures simultanées doit être assurée par le code.
2. **SQLite** : vraies requêtes (recherche, pagination, tri) et écritures transactionnelles, dans un seul fichier. Mais cela impose un module natif ou intégré à installer et à maintenir côté Node.js, et une couche d'accès aux données.
3. **PostgreSQL** (ou autre serveur de base de données) : robuste et adapté à plusieurs utilisateurs. Mais il demande un serveur, ou Docker, à installer avant de pouvoir lancer l'application : contraire à l'objectif d'installation légère.
4. **Données en mémoire seulement** : le plus simple et le plus rapide, mais tout est perdu à l'arrêt de l'API, ce qui rend l'application inutile pour prendre des notes.

## Décision

Nous stockons les notes dans un fichier JSON, `api/notes.json` (chemin modifiable avec `NOTES_FILE`), lu et écrit avec le module `fs/promises`. Les écritures sont mises en file dans le processus de l'API, et le fichier est remplacé en une fois à partir d'un fichier temporaire.

## Conséquences

- ✅ Stockage sans dépendance supplémentaire ni service externe : le fichier est créé au premier ajout, et le README tient en quelques commandes.
- ✅ Données faciles à inspecter, à copier et à réinitialiser pendant le développement ; les tests utilisent simplement un fichier temporaire.
- ✅ Les écritures en file et le remplacement atomique du fichier évitent de perdre des notes lors d'écritures simultanées, et un fichier corrompu n'est jamais écrasé (l'API répond `500`).
- ⚠️ Chaque opération de lecture ou d'écriture des notes charge et analyse le fichier entier, y compris `GET /notes` et `/search`. Le coût augmente avec le nombre et la taille des notes ; aucun seuil de capacité n'a été mesuré.
- ⚠️ Un seul processus API doit utiliser un même fichier. Deux processus, ou un déploiement avec plusieurs instances, peuvent s'écraser mutuellement.
- ⚠️ Pas de requête indexée : la recherche et la pagination se font en parcourant le tableau en mémoire (voir ADR-0002).
- ⚠️ Le remplacement atomique évite un fichier partiellement écrit pendant le fonctionnement normal ; le code ne force pas la synchronisation sur disque et ne garantit pas la conservation du dernier ajout lors d'une coupure de courant.
- ⚠️ Cette décision est à réévaluer si l'application est déployée pour plusieurs utilisateurs ou si les mesures de latence et de mémoire deviennent insatisfaisantes : l'option SQLite sera alors à étudier, avec un nouvel ADR qui remplacerait celui-ci.
