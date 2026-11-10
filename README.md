# notes-app

Application de prise de notes : une API Node.js/Express qui enregistre les notes dans un fichier JSON, et une interface React (Vite) pour les créer, les rechercher et les parcourir.

Projet pédagogique du module « Travail collaboratif et documentation technique », prévu pour un usage local.

## Prérequis

- Node.js 22.12 ou plus récent (la CI utilise Node.js 24)
- npm (installé avec Node.js)
- Git

## Installation

Le dépôt est privé : il faut en être collaborateur pour le cloner.

```bash
git clone https://github.com/Cromca/notes-app.git
cd notes-app
```

Dans un premier terminal, l'API :

```bash
cd api
npm ci
npm start
```

L'API affiche `API sur http://127.0.0.1:3000` et écoute sur http://localhost:3000.

Dans un second terminal, le front :

```bash
cd web
npm ci
npm run dev
```

Vite affiche l'adresse du front, habituellement http://localhost:5173. Si le port 5173 est déjà pris, Vite en choisit un autre : l'API refusera alors les requêtes du front, voir `CORS_ORIGINS` dans la configuration.

## Configuration

Toutes les variables sont facultatives.

| Variable | Partie | Rôle | Valeur par défaut |
| --- | --- | --- | --- |
| `PORT` | api | Port d'écoute de l'API | `3000` |
| `HOST` | api | Interface d'écoute de l'API | `127.0.0.1` (machine locale uniquement) |
| `NOTES_FILE` | api | Fichier où les notes sont enregistrées | `api/notes.json` (exclu de Git) |
| `CORS_ORIGINS` | api | Origines web autorisées, séparées par des virgules, sans chemin. Remplace la liste par défaut ; `*` est refusé | `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`, `http://127.0.0.1:4173` |
| `VITE_API_URL` | web | Adresse de l'API, lue au démarrage de Vite ou à la compilation | `http://localhost:3000` |

Exemple si Vite démarre sur le port 5177 :

```bash
CORS_ORIGINS=http://localhost:5177,http://127.0.0.1:5177 npm start
```

## Usage

### Interface

![Interface de notes-app avec trois notes](docs/img/front.png)

- Saisir un titre, un contenu et éventuellement un tag, puis choisir **Ajouter**. Le titre est obligatoire (160 caractères au plus).
- Si l'enregistrement échoue, le brouillon reste dans le formulaire et un message explique le problème.
- La liste affiche dix notes par page, avec les boutons **Précédent** et **Suivant**.
- La recherche porte sur tous les titres et ignore la casse.
- Le contenu des notes est affiché comme du texte : le HTML saisi n'est pas interprété.

### API

| Méthode | Route | Description |
| --- | --- | --- |
| `POST` | `/notes` | Crée une note. `title` obligatoire (1 à 160 caractères), `body` facultatif (20 000 au plus), `tag` facultatif (50 au plus) |
| `GET` | `/notes?page=1` | Liste paginée, dix notes par page. Le nombre total de notes est dans l'en-tête `X-Total-Count` |
| `GET` | `/notes/by-tag/<tag>` | Notes dont le tag correspond exactement |
| `GET` | `/search?q=<texte>` | Recherche dans tous les titres, sans tenir compte de la casse. `q` ne doit pas être vide |
| `DELETE` | `/notes/<id>` | Supprime une note : `204`, ou `404` si l'identifiant n'existe pas |

Les exemples ci-dessous ont été exécutés sur une API neuve. L'identifiant (`id`) est un UUID généré à la création.

Créer une note :

```bash
curl -i -X POST localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Courses", "body": "Pain, lait", "tag": "perso"}'
```

```text
HTTP/1.1 201 Created
X-Total-Count: 1

{"id":"967b160a-2966-47a5-b623-02d8bfc79639","title":"Courses","body":"Pain, lait","tag":"perso"}
```

Lister la première page :

```bash
curl -i "localhost:3000/notes?page=1"
```

```text
HTTP/1.1 200 OK
X-Total-Count: 1

[{"id":"967b160a-2966-47a5-b623-02d8bfc79639","title":"Courses","body":"Pain, lait","tag":"perso"}]
```

Filtrer par tag, puis rechercher dans les titres :

```bash
curl localhost:3000/notes/by-tag/perso
curl "localhost:3000/search?q=courses"
```

```text
[{"id":"967b160a-2966-47a5-b623-02d8bfc79639","title":"Courses","body":"Pain, lait","tag":"perso"}]
```

Supprimer une note :

```bash
curl -i -X DELETE localhost:3000/notes/967b160a-2966-47a5-b623-02d8bfc79639
```

```text
HTTP/1.1 204 No Content
```

Les erreurs sont renvoyées en JSON, avec une clé `error` :

```bash
curl -i -X POST localhost:3000/notes -H "Content-Type: application/json" -d '{"body": "sans titre"}'
```

```text
HTTP/1.1 400 Bad Request

{"error":"Le titre doit contenir entre 1 et 160 caractères."}
```

Les principaux codes sont `400` (donnée invalide, par exemple `?page=0`), `403` (origine web non autorisée), `404` (note ou route inconnue) et `413` (requête trop volumineuse).
