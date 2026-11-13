# ADR-0001 : Stocker les notes dans un fichier JSON

- **Statut** : Accepté
- **Date** : 2026-11-13
- **Auteur** : Hugo
- **Issue** : #33

## Contexte

L'API doit garder les notes entre deux redémarrages. Le projet est une application de cours :

- un seul utilisateur, en local, sans authentification ;
- un seul processus API qui lit et écrit les données ;
- quelques dizaines ou centaines de notes, pas plus ;
- trois développeurs qui doivent pouvoir cloner et lancer le projet en deux commandes, sur macOS et Windows ;
- l'application de départ fournie au début du module stockait déjà les notes dans `api/notes.json`.

Les tests de l'API doivent aussi pouvoir tourner avec des données isolées, sans rien installer de plus.

## Options envisagées

### Option A : un fichier JSON (`api/notes.json`)

Toutes les notes dans un tableau JSON. L'API relit le fichier à chaque requête et le réécrit en entier à chaque modification.

- ➕ Rien à installer, le fichier est créé au premier ajout
- ➕ Lisible et modifiable à la main pour déboguer
- ➕ Chaque test utilise son propre fichier temporaire (`NOTES_FILE`)
- ➖ Tout le fichier est relu et réécrit à chaque opération : ça ralentit quand le nombre de notes grandit
- ➖ Aucune protection si deux processus écrivent dans le même fichier
- ➖ Pas de requêtes : filtres et recherche sont faits en JavaScript sur le tableau entier

### Option B : SQLite

Une base dans un seul fichier, avec du SQL.

- ➕ Vraies requêtes (filtre par tag, recherche, pagination en SQL), index possibles
- ➕ Transactions : plusieurs processus peuvent écrire sans corrompre la base
- ➖ Soit une dépendance native de plus (`better-sqlite3`), dont l'installation peut échouer selon le poste et la version de Node.js ; soit le module intégré `node:sqlite` (disponible depuis Node.js 22.5.0, testé sur la v24.13.1), sans dépendance à installer mais encore classé « release candidate » et qui affiche un avertissement expérimental
- ➖ Un schéma et des migrations à maintenir
- ➖ Fichier binaire : on ne peut plus le lire ou le corriger à la main

### Option C : un serveur de base de données (PostgreSQL, MongoDB)

- ➕ Prêt pour plusieurs utilisateurs et plusieurs instances de l'API
- ➖ Un serveur à installer et lancer en plus (ou Docker), sur chaque poste et dans la CI
- ➖ Beaucoup plus de configuration que ce que demande une application locale à un utilisateur

## Décision

On garde **l'option A, le fichier JSON**.

Elle répond au besoin actuel (un utilisateur, un processus, peu de notes) sans rien ajouter à l'installation. Pour limiter ses risques, deux protections sont déjà dans `api/store.js` :

- les écritures sont faites l'une après l'autre dans le processus API ;
- chaque écriture passe par un fichier temporaire, renommé en `notes.json` seulement une fois complet. Un fichier illisible renvoie une erreur 500 et n'est jamais écrasé.

## Conséquences

Positives :

- Installation en `npm ci` + `npm start`, sans base de données.
- Les tests créent un fichier temporaire par test et ne touchent pas aux vraies notes.
- Les données se lisent directement dans `api/notes.json`.

Négatives :

- **Une seule instance de l'API par fichier.** Lancer deux API sur le même `notes.json` peut faire perdre des notes : c'est écrit dans le README.
- Les performances baissent avec le volume : chaque requête relit tout le fichier.
- Pas de sauvegarde ni d'historique : si `notes.json` est supprimé, les notes sont perdues (le fichier est exclu de Git).
- Le remplacement du fichier est atomique, mais le code ne force pas l'écriture sur disque (pas de `fsync`) : après une coupure de courant ou un arrêt brutal, le dernier ajout peut être perdu.
- Filtre par tag, recherche et pagination sont codés à la main en JavaScript, au lieu d'être faits par la base.

## Quand revoir cette décision

Si l'application doit gérer plusieurs utilisateurs ou tourner sur un serveur partagé, ou si la latence devient gênante, passer à SQLite (option B) et écrire un nouvel ADR qui remplace celui-ci.

Mesure faite par Mohand sur l'API actuelle (Node.js 24.13.1, Windows, fichier local, notes d'environ 300 octets, médiane de 5 requêtes) :

| Notes | Fichier | `GET /notes?page=1` | `GET /search` | `POST /notes` |
| --- | --- | --- | --- | --- |
| 1 000 | 0,3 Mo | 3 ms | 3 ms | 6 ms |
| 5 000 | 1,4 Mo | 8 ms | 6 ms | 17 ms |
| 20 000 | 5,8 Mo | 32 ms | 36 ms | 77 ms |
| 50 000 | 14,7 Mo | 81 ms | 79 ms | 150 ms |

Jusqu'à quelques milliers de notes, la latence reste négligeable. Elle devient perceptible vers 50 000 notes, surtout en écriture, puisque chaque ajout relit et réécrit tout le fichier.
