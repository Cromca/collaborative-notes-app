# Contribuer à notes-app

## Règle de l'équipe : main est protégée

On n'a pas pu activer la protection de branche sur ce dépôt, donc on l'applique nous-mêmes :

- Pas de push direct sur `main` (sauf l'import initial, déjà fait).
- Tout changement passe par une branche (`fix/…`, `feat/…`, `docs/…`, `chore/…`) avec le numéro de l'issue, puis une pull request.
- Une PR doit être approuvée par au moins 1 autre membre avant le merge.
- Si de nouveaux commits arrivent après l'approbation, on redemande une relecture.
- Pas de `git push --force` sur `main`.

## Stratégie de merge

On utilise **Squash and merge** : un commit par PR sur `main`, et on supprime la branche après le merge.
