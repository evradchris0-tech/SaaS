# Nkap — Standards d'ingénierie (le « comment on travaille »)

> 🕒 Créé : [Claude] 2026-06-14. Les règles d'une équipe pro. À respecter par Chris, Claude et Gemini/Antigravity.

## 1. Dépôt

- Monorepo : `docs/` (modélisation, décisions) + `nkap-core-service/` (NestJS Core).
- Remote : `github.com/evradchris0-tech/SaaS`. Branche par défaut : `main` (⚠️ actuellement `master` — à renommer).

## 2. Workflow Git (trunk-based)

- `main` **protégée** : pas de push direct. Tout passe par **Pull Request**.
- Branches courtes : `feat/<sujet>`, `fix/<sujet>`, `chore/<sujet>`, `docs/<sujet>`.
- Merge : **squash**, après ✅ CI verte + **1 review** (CODEOWNERS).

## 3. Commits — Conventional Commits

`type(scope): sujet` — types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`.
Ex. : `feat(tontine): ajoute le moteur de génération des rounds`.

## 4. Qualité — la CI doit passer (`.github/workflows/ci.yml`)

Sur chaque PR : **install → lint → typecheck → test (+ coverage) → build**, avec un Postgres de test.
Aucun merge si un job est rouge.

## 5. Tests

- Unitaires : `*.spec.ts` à côté du code. Priorité absolue : **la logique financière** (ledger, calculs, waterfall) — viser ~90% de couverture sur les services `*.service.ts`.
- E2E : `test/*.e2e-spec.ts` contre Postgres.
- Invariants à toujours tester : `Σ(lignes d'une LedgerTransaction) = 0` ; `Fund.cachedBalance = Σ LedgerEntry`.

## 6. Règles non négociables (rappel modèle)

- **Argent = entiers** (plus petite unité, FCFA = 0 décimale) + `BigIntTransformer` sur les colonnes `bigint`.
- **Ledger append-only** : pas de soft-delete sur les écritures ; corrections = contre-passation.
- **`synchronize: false`** en prod : on versionne le schéma via **migrations TypeORM**.
- **Secrets** : jamais dans le repo. Seul `.env.example` est commité.

## 7. Definition of Done (cf. template de PR)

Lint+typecheck verts · tests verts · pas de secret · migration si schéma · docs à jour.

## 8. Roadmap outillage

- [x] CI (GitHub Actions) · [x] docker-compose Postgres · [x] `.env.example` · [x] `BigIntTransformer` (+ test)
- [x] Husky + lint-staged (pre-commit : prettier) · [x] commitlint (commit-msg) · [x] Dependabot · [x] CodeQL
- [x] Templates PR / issues · [x] CODEOWNERS · [x] CONTRIBUTING / SECURITY
- [ ] Protection de branche `main` (GitHub) · [ ] `npm audit` en CI · [ ] Dockerfile multi-stage + CD staging
