# Contribuer à notes-app

Ce fichier décrit ce que l'équipe fait vraiment depuis le début du module. Qui fait quoi et où trouver chaque information : [docs/equipe.md](docs/equipe.md).

## Règle de l'équipe : main est protégée

On n'a pas pu activer la protection de branche sur ce dépôt, donc on l'applique nous-mêmes :

- Pas de push direct sur `main` (sauf l'import initial, déjà fait).
- Pas de `git push --force` sur `main`.

## Workflow

1. **Une issue d'abord.** Tout changement part d'une issue : bug (modèle « Bug »), tâche ou doc. Titre clair, contexte, critère de fin. On s'assigne l'issue avant de commencer.
2. **Une branche par issue**, depuis `main` à jour : `type/numero-description`.
   Exemples : `fix/1-pagination`, `fix/11-brouillon-erreur`, `docs/30-readme`.
   Types : `feat`, `fix`, `docs`, `refactor`, `chore`, `revert`.
3. **Commits au format Conventional Commits**, avec la partie concernée quand il y en a une :
   `fix(api): corrige le décalage de pagination sur GET /notes (#1)`, `fix(web): …`, `docs: …`.
4. **Pull request vers `main`** avec le modèle rempli (Contexte, Changements, Impact, Comment tester, Checklist) et `Closes #n`.
5. **La CI doit être verte** : le workflow « Vérifications » lance les tests de l'API, les tests du front, le lint et le build.

## Review

- Au moins **1 approbation** d'un autre membre avant le merge. Les reviewers sont proposés automatiquement par [`.github/CODEOWNERS`](.github/CODEOWNERS).
- On relit d'abord la justesse (le code fait-il ce que dit l'issue ?), puis la lisibilité, la performance et la sécurité.
- Commentaires étiquetés avec les Conventional Comments : `issue`, `suggestion`, `question`, `nitpick`, `praise`, avec `(non-blocking)` quand le point ne bloque pas le merge.
- Chaque commentaire bloquant est traité (correction ou réponse) avant l'Approve.
- Si de nouveaux commits arrivent après l'approbation, on redemande une relecture.

## Merge

- **Squash and merge** : un commit par PR sur `main`.
- Une fois la PR approuvée sur GitHub (un accord oral ne compte pas) et la CI verte, l'auteur ou Cromca (propriétaire du dépôt) merge, puis supprime la branche.
- Pour annuler un changement déjà mergé : une issue, puis une PR de revert (exemple : #25, #26, #27). Jamais de réécriture de l'historique de `main`.

## Documentation

- Une PR qui change un comportement (route, paramètre, variable d'environnement, écran) met à jour le README **dans la même PR**.
- Une décision d'architecture (stockage, pagination, état du front…) fait l'objet d'un ADR dans `docs/adr/`, relu en PR.
- Une décision prise à l'oral ou sur la messagerie n'existe pas tant qu'elle n'est pas écrite dans une issue, une PR ou un ADR.
