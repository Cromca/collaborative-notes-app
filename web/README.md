# Interface notes-app

Interface React/Vite en français. Le guide complet est dans [../README.md](../README.md).

```sh
npm ci
npm run dev
```

La recherche attend 300 ms après la dernière frappe avant d'interroger l'API, pour ne pas envoyer une requête par lettre tapée.

L'API doit être démarrée dans un autre terminal (`cd api`, puis `npm start`). Pour une autre adresse d'API, définir `VITE_API_URL` avant de démarrer Vite. Si le port du front change, adapter aussi `CORS_ORIGINS` côté API.

```sh
npm test
npm run lint
npm run build
```

`npm run preview` permet de vérifier la compilation sur le port 4173. Les tests React utilisent jsdom et des réponses HTTP simulées ; les tests d'intégration HTTP de l'API se trouvent dans `../api/test/`.
