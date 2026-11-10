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
