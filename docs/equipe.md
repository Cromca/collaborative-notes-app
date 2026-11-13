# Qui fait quoi

Le Wiki GitHub n'est pas activé sur ce dépôt (seul le propriétaire peut l'activer). Cette page vit donc dans le dépôt et se modifie par pull request, comme le reste de la doc.

## L'équipe

| Personne | Compte GitHub | Rôle principal |
| --- | --- | --- |
| Quentin | [@Cromca](https://github.com/Cromca) | Propriétaire du dépôt, API, merge et CI |
| Mohand | [@Mohand-123](https://github.com/Mohand-123) | Front React et validation côté API |
| Hugo | [@H129hj](https://github.com/H129hj) | Documentation (README, ADR, CONTRIBUTING) et front |

## Matrice RACI

R : réalise · A : valide, un seul par ligne · C : consulté avant · I : informé après

| Livrable | Quentin (@Cromca) | Mohand (@Mohand-123) | Hugo (@H129hj) | Formateur |
| --- | --- | --- | --- | --- |
| Nouvelle route ou correctif de l'API | A | R | C | I |
| Nouveau composant ou correctif du front | C | A | R | I |
| README | C | C | R / A | I |
| ADR (`docs/adr/`) | A | C | R | C |
| CONTRIBUTING.md et CODEOWNERS | A | C | R | I |
| Modèles d'issue et de PR | A | I | R | |
| CI (`.github/workflows/`) | R / A | I | C | |
| Merge sur `main` | A | R | R | I |

## Où trouver quoi

| Information | Où | Pourquoi là |
| --- | --- | --- |
| Installation, usage, routes de l'API, architecture | [README.md](../README.md) | Évolue avec le code, relu en PR |
| Décisions techniques | [docs/adr/](adr/) | Versionnées avec le code qu'elles justifient |
| Workflow Git, règles de review et de doc | [CONTRIBUTING.md](../CONTRIBUTING.md) | GitHub affiche le lien à l'ouverture d'une PR |
| Qui relit quelle partie | [.github/CODEOWNERS](../.github/CODEOWNERS) | Appliqué automatiquement par GitHub |
| Rôles de l'équipe, RACI | cette page | Concerne l'équipe plutôt que le code |
| Bugs et tâches | [Issues](https://github.com/Cromca/collaborative-notes-app/issues) | Assignables, fermées par la PR qui corrige |
| Discussion sur un changement précis | [Pull requests](https://github.com/Cromca/collaborative-notes-app/pulls) | Attachée aux lignes de code concernées |
| État des tests sur chaque PR | [Actions](https://github.com/Cromca/collaborative-notes-app/actions) | Workflow « Vérifications » |
| Énoncés et rendus des quêtes | quetes.dev | Plateforme du formateur |
| Discussion rapide | Messagerie de l'équipe | Éphémère : la conclusion est recopiée dans une issue ou une PR |
