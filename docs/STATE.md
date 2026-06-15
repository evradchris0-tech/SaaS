# État du Projet (State)

**Phase actuelle** : Développement Backend — MVP financier opérationnel, testé E2E, robuste en concurrence.
**Date** : 15 Juin 2026
**`main`** : vert (CI complète : lint · typecheck · test · build · **E2E Postgres**), protégé (PR + checks requis).

## ✅ Livré sur `main`

**Auth & sécurité**
- Inscription/connexion JWT (bcrypt 12), `JWT_SECRET` requis au boot en prod.
- **Refresh token** (opaque, hash SHA-256 stocké) avec **rotation** + **révocation** (logout) ; access token court (15 min).
- Throttler anti-brute-force (global + `/auth`).
- **Sérialisation anti-fuite** : `@Exclude` + `ClassSerializerInterceptor` global (jamais de `passwordHash` exposé).

**Multi-tenant**
- `Organization` + `OrganizationMembership` (OWNER/ADMIN/MEMBER), isolation stricte par organisation.
- CRUD org + gestion des membres (rôles, garde « dernier OWNER ») + **pagination**.

**Tontine (moteur P1 — ROTATING)**
- Création (DRAFT + 4 caisses + Président), ajout de membres (Président), activation (génération des Rounds).
- **Cycle de vie complet** : `COLLECTING → READY → PAID → CLOSED`, `closeCycle` (ouverture du suivant) → tontine `COMPLETED`.
- Tirages bénéficiaires : FIXED + RANDOM_DRAW + NEED_BASED.
- `contribute` / `payout` durcis (montant attendu, tontine ACTIVE, authz appelant).

**Ledger (partie double)**
- `LedgerTransaction` immuable + `LedgerEntry`, idempotence (clé + catch `23505`), **verrou pessimiste** sur la caisse.
- **Prouvé sous charge** : 300 requêtes concurrentes, invariants OK (pas de lost update, idempotence).

**Pénalités** : cron horaire (`@nestjs/schedule`) de détection des retards.

**Observabilité** : logs structurés JSON (Pino) + corrélation de requête + redaction des secrets.

**Qualité / CI-CD**
- Tests : **76 unitaires + 20 e2e** (validation DTO, sécurité/authz, smoke, lifecycle complet, refresh, sérialisation).
- CI GitHub Actions (lint·tsc·test·build·**e2e Postgres**), CodeQL, Dependabot, Husky/commitlint, `main` protégée.

## 🔜 En cours / à venir
- **P2 — Enchères (AUCTION)** *(Antigravity)* : archi revue par Claude ; **en attente** de la règle de distribution du dividende (fonds `DIVIDEND` + flux Ledger au `closeCycle`) avant codage.
- **P3 — ASCA** (épargne + prêts/intérêts, Obligation), **P4 — Solidarité**, **P5 — Défauts** (waterfall Garant→Secours→Mutualisation), **P6 — Notifications**.
- Dette/hardening restante : authz centralisée (guards/policies), arrondi pénalité PERCENT, retrait `--forceExit` (cron corrigé).
- **Front Angular** : non démarré (backend exposé via Swagger `/api/docs`).

## Répartition trinôme
- **Chris** : orchestration, merges GitHub (PR), arbitrages produit.
- **Claude** : couches externes (auth, controllers, DTO, sécurité, observabilité, CI/CD), revue croisée, tests e2e (accès DB local).
- **Antigravity** : cœur domaine (Ledger, Strategy, cycle de vie, moteur de calcul).

## Log des modifications (récent)
- **[Antigravity - 2026-06-14]** : modélisation domaine, Ledger partie double, plan d'exécution.
- **[Claude - 2026-06-15]** : Sprints 1→5 + durcissement (sécurité/multi-tenant/refresh/sérialisation/observabilité/pagination), gating e2e CI, revue croisée P1/P2, nettoyage des branches. `main` vert et à jour (`2ba00a4`).
