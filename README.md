# Nkap — Plateforme multi-tontines

SaaS de gestion de tontines (njangi / ROSCA) adaptatif : rotatives, à enchères, à épargne (ASCA), caisses de secours, prêts, pénalités.

## Structure (monorepo)

- **`docs/`** — modélisation et gouvernance : `MODELISATION_UML.md`, `DOMAIN_MODEL.md`, `DECISIONS.md`, `ENGINEERING.md`, `JOURNAL.md`.
- **`nkap-core-service/`** — backend **NestJS** (Core Service, PostgreSQL, TypeORM).

## Démarrer (dev)

```bash
# 1. Base de données locale
cd nkap-core-service
docker compose up -d            # PostgreSQL
cp .env.example .env            # adapter si besoin

# 2. Dépendances + app
npm install
npm run start:dev               # http://localhost:3000
```

## Qualité

- CI : `.github/workflows/ci.yml` (lint · typecheck · test · build).
- Hooks : Husky (pre-commit = prettier, commit-msg = Conventional Commits).
- Règles d'équipe : voir [`docs/ENGINEERING.md`](docs/ENGINEERING.md).

## Règle d'or (argent)

Montants en **entiers** (plus petite unité, FCFA = 0 décimale) ; colonnes `bigint` + `BigIntTransformer`. Ledger **append-only**. `synchronize: false` en prod (migrations).
