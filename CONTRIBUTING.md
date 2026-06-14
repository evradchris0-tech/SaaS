# Contribuer à Nkap

Merci de respecter les standards de l'équipe ([`docs/ENGINEERING.md`](docs/ENGINEERING.md)).

## Workflow

1. Crée une branche depuis `main` : `feat/...`, `fix/...`, `chore/...`, `docs/...`.
2. Commits **Conventional Commits** : `feat(tontine): ...` (vérifié par commitlint).
3. Ouvre une **Pull Request** vers `main` (template auto-rempli). Pas de push direct sur `main`.
4. La **CI doit être verte** et **1 review** (CODEOWNERS) est requise pour merger (squash).

## Avant de pousser

- `npm run lint` · `npx tsc --noEmit` · `npm test` (verts).
- Test ajouté pour toute logique financière.
- `.env.example` à jour si nouvelle variable ; **aucun secret** commité.
- Migration TypeORM générée si le schéma change.

## Définition de « Done »

Voir la checklist du template de Pull Request.
