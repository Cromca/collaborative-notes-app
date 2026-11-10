# notes-app

Application pédagogique de prise de notes : API Express et interface React/Vite.

## Démarrer

Prérequis : Node.js 22.12+ ou 24 LTS et npm. Dans deux terminaux :

```sh
cd api
npm ci
npm start
```

```sh
cd web
npm ci
npm run dev
```

L'API écoute sur `http://localhost:3000`, l'interface sur l'adresse affichée par Vite (habituellement `http://localhost:5173`). Les notes sont enregistrées dans `api/notes.json`, exclu de Git. Le chemin ne dépend pas du dossier depuis lequel Node est lancé.

Configuration facultative : `PORT`, `HOST`, `NOTES_FILE` et `CORS_ORIGINS` pour l'API ; `VITE_API_URL` pour le front (au démarrage de Vite ou à la compilation). L'API est liée à l'interface locale par défaut. Cette application de cours ne dispose pas d'authentification : elle est destinée à un usage local avec un seul processus API par fichier de données.

Les origines web autorisées par défaut sont `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173` et `http://127.0.0.1:4173`. Si Vite utilise un autre port, définir `CORS_ORIGINS` avec les origines exactes séparées par des virgules puis redémarrer l'API, par exemple `http://localhost:5177,http://127.0.0.1:5177`. Cette variable remplace la liste par défaut ; `*` et les URL contenant un chemin sont refusés. Les appels CLI sans en-tête Origin restent autorisés. Cette restriction navigateur ne remplace pas l'authentification.

## Utilisation

- Saisir un titre, un contenu et éventuellement un tag, puis choisir **Ajouter**.
- Le brouillon reste présent si l'enregistrement échoue ; un message permet de comprendre le problème.
- La liste contient dix notes par page. La recherche interroge tous les titres et ignore la casse.
- Les contenus sont affichés comme du texte, y compris s'ils contiennent du HTML.

## API

| Route | Comportement |
| --- | --- |
| `GET /notes?page=1` | Tableau de dix notes maximum ; total dans l'en-tête `X-Total-Count`. Page entière positive obligatoire si fournie. |
| `POST /notes` | Création avec `title` (1–160 caractères après nettoyage), `body` facultatif (20 000 maximum), `tag` facultatif (50 maximum). Retour 201 ; position d'insertion dans `X-Total-Count`, utilisée pour afficher la bonne page même si la liste initiale n'est pas encore chargée. |
| `GET /search?q=texte` | Recherche dans tous les titres, insensible à la casse. `q` doit être un texte non vide. |
| `GET /notes/by-tag/:tag` | Correspondance exacte du tag. |
| `DELETE /notes/:id` | Suppression d'une note : 204, ou 404 si l'identifiant est inconnu. |

Les nouvelles notes reçoivent un UUID. Les anciens identifiants numériques restent pris en charge. Les notes sans titre provenant d'une ancienne version sont ignorées par la recherche. Les doublons historiques ne sont pas réécrits automatiquement ; une suppression ne retire qu'une note correspondante à la fois.

Les erreurs sont renvoyées en JSON (`error`). Un fichier corrompu produit une erreur 500 sans être écrasé. Les écritures sont sérialisées dans le processus API et remplacent le fichier après écriture complète d'un fichier temporaire.

## Vérifier

```sh
cd api
npm test
```

```sh
cd web
npm test
npm run lint
npm run build
```

Les tests utilisent des données temporaires et des ports libres. Ils couvrent pagination, validation, identifiants, écritures concurrentes, recherche, erreurs de stockage, origines autorisées/refusées, rendu HTML inerte, conservation du brouillon, double envoi et réponses arrivant dans le désordre.

## Suivi

- Hugo : pagination #1, requêtes répétées #4, conservation du brouillon #11.
- Mohand : sécurité XSS #3, lisibilité #5, validation des notes #10.
- Cromca : identifiants #2, validation de la recherche #9, contrôle des origines #15.

Les corrections passent par une branche et une pull request liée aux issues, selon [CONTRIBUTING.md](CONTRIBUTING.md). Les PR d'Hugo #6 (modèles), #8 (pagination), #13 (chargement) et #14 (brouillon) sont intégrées dans main. La PR #12 complète ces corrections et ajoute les tests.
