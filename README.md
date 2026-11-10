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

Configuration facultative : `PORT`, `HOST` et `NOTES_FILE` pour l'API ; `VITE_API_URL` pour le front (au démarrage de Vite ou à la compilation). L'API est liée à l'interface locale par défaut. Cette application de cours ne dispose pas d'authentification : elle est destinée à un usage local avec un seul processus API par fichier de données.

## Utilisation

- Saisir un titre, un contenu et éventuellement un tag, puis choisir **Ajouter**.
- Le brouillon reste présent si l'enregistrement échoue ; un message permet de comprendre le problème.
- La liste contient dix notes par page. La recherche interroge tous les titres et ignore la casse.
- Les contenus sont affichés comme du texte, y compris s'ils contiennent du HTML.

## API

| Route | Comportement |
| --- | --- |
| `GET /notes?page=1` | Tableau de dix notes maximum ; total dans l'en-tête `X-Total-Count`. Page entière positive obligatoire si fournie. |
| `POST /notes` | Création avec `title` (1–160 caractères après nettoyage), `body` facultatif (20 000 maximum), `tag` facultatif (50 maximum). Retour 201. |
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

Les tests utilisent des données temporaires et des ports libres. Ils couvrent pagination, validation, identifiants, écritures concurrentes, recherche, erreurs de stockage, rendu HTML inerte, conservation du brouillon, double envoi, recherche et réponses arrivant dans le désordre.

## Suivi

- Hugo : pagination #1, requêtes répétées #4, conservation du brouillon #11.
- Mohand : sécurité XSS #3, lisibilité #5, validation des notes #10.
- Cromca : identifiants #2, validation de la recherche #9.

Les corrections passent par une branche et une pull request liée aux issues. Le modèle d'issue et le modèle de PR sont proposés dans la PR #6, et le correctif initial de pagination d'Hugo dans la PR #8.
