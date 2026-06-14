# Nkap — Journal de contributions

> **Convention d'horodatage et de signature** (Chris + Claude + Gemini)
>
> - Chaque modification d'un doc partagé est journalisée ici, **la plus récente en haut**.
> - Format : `## AAAA-MM-JJ HH:MM (UTC+1) — [Auteur]` puis la liste des changements. Auteurs : `[Claude]`, `[Gemini]`, `[Chris]`.
> - Chaque doc canonique porte en tête une ligne `🕒 Révision — dernière MAJ : [Auteur] date`.
> - **Règle anti-écrasement** : avant d'écraser un doc, le **lire** (vérifier la dernière révision). Si l'autre agent a écrit après, on **fusionne**, on n'écrase pas.

---

## 2026-06-14 06:57 (UTC+1) — [Claude] — Règles du dépôt (config entreprise)

- Outillage qualité racine installé : **Husky** (hooks actifs), **commitlint** (Conventional Commits), **lint-staged** (prettier au pre-commit).
- Gouvernance : `README`, `CONTRIBUTING`, `SECURITY`, `CODEOWNERS`, template PR, templates d'issues, `dependabot.yml`, `codeql.yml`, `.editorconfig`, `.nvmrc`.
- Test : `column-numeric.transformer.spec.ts` (régression du bug d'argent bigint).
- Install service relancée proprement (`Set-Location` ; `npm --prefix` ne créait pas `node_modules` sur Windows).
- Reste : init Git (master→main, commit bootstrap, branche `develop`), push + protection de branche (en attente du GO de Chris).

## 2026-06-14 06:41 (UTC+1) — [Claude] — Phase BUILD (CI/CD entreprise)

- Scaffold Gemini revu (code review lead). **Bug bloquant l'install** : `@nestjs/typeorm@^10` incompatible NestJS 11 → corrigé en `^11` + ajout `@nestjs/config`, `@nestjs/swagger`, `class-validator`, `class-transformer`. Re-install relancée.
- **Bug d'argent corrigé** : `Fund.cachedBalance` (bigint) hydraté en `string` par TypeORM → `BigIntTransformer` (`src/common/transformers`).
- **Fondation CI/CD** : `.github/workflows/ci.yml` (lint/typecheck/test/build + Postgres), `.gitignore`, `CODEOWNERS`, template PR, `docker-compose.yml`, `.env.example`, `docs/ENGINEERING.md`.
- Repo : racine `D:/SaaS`, branche `master` (→ renommer `main`), rien encore commité.
- À appliquer par Gemini (review) : `TontineStatus` enum, typer `ruleSet`, index `organizationId`, `CENSEUR`→`CENSOR`.

## 2026-06-14 06:20 (UTC+1) — [Claude] 🔒 VERROU MODÉLISATION

- `MODELISATION_UML.md` **verrouillé** : intégration des 4 diagrammes de classes (BC1/BC2/BC3/BC5, BC2 avec `DefaultRule`), 9 séquences (4.4–4.12), 4 états (5.4–5.7). Validé par Antigravity (MCP Mermaid HS — voie de validation alternative).
- `DOMAIN_MODEL.md` : catalogue synchronisé (Subscription, Sponsorship, BeneficiaryAssignment, Auction, Bid, ShareTransfer, ApprovalVote, Meeting, Resolution) ; `FundType` += `PLATFORM` ; rôles/statuts Membership enrichis.
- `MODELING_PLAN.md` : classes/séquences/états = ✅. Restent NON bloquants : déploiement + glossaire.
- **GO scaffold du Core Service** donné à Antigravity.

## 2026-06-14 06:13 (UTC+1) — [Claude]

- Décision #15 (politique de défaut) **validée par Chris** (aucun règlement réel trouvé) ; reste configurable via `DefaultRule`. Gemini a approuvé les états + séquences Défaut/Création.
- Dernier lot de séquences produit (drafts) : Onboarding multi-garants, Enchères, Prêt ASCA, Réclamation solidarité, Cession de part, Pénalité, Contre-passation.
- Prochaine étape : re-valider au rendu (MCP) tous les diagrammes en attente, puis **verrouiller `MODELISATION_UML.md`** → GO scaffold.

## 2026-06-14 06:00 (UTC+1) — [Claude]

- **Décision #15** (déléguée par Chris : « prends la plus répandue ») : défaut membre = **waterfall configurable** `[GUARANTOR → SAFETY_FUND → MUTUALIZE]` + exclusion, encodée dans `DefaultRule`. Hypothèse à confirmer sur un règlement réel.
- Modélisation poursuivie (**drafts**, MCP Mermaid down) : états Obligation/Membership/Approval/Auction ; séquences Défaut-membre et Créer/configurer une tontine. À re-valider au rendu avant intégration.
- BC2 affiné : Antigravity le rend correctement (retour Gemini) ; re-validation formelle MCP en attente.

## 2026-06-14 05:36 (UTC+1) — [Claude]

- Diagrammes de classes **BC1, BC3, BC5 validés au rendu** ; **BC2 affiné** avec les ajouts Gemini (`closeCycle`, `onMemberDefault`, `GovernanceRule`, `LoanRule`, `PlatformFeeRule`). Les 4 présentés pour la **grande revue finale** avant intégration dans `MODELISATION_UML.md`.
- Implication actée à confirmer : `FundType` gagne **`PLATFORM`** (les frais SaaS deviennent des écritures Ledger auditables).
- Incident : MCP Mermaid expiré pendant la passe ; BC2 corrigé (renommage défensif `type/value/base`), à re-confirmer au prochain rendu.

## 2026-06-14 05:20 (UTC+1) — [Claude]

- Décision Chris : **modélisation complète avant de coder**. Création de `MODELING_PLAN.md` (checklist / définition de « terminé », découpage en 5 bounded contexts).
- Diagramme de classes **BC2 — Moteur de règles (Strategy + RuleSet)** validé au rendu, en attente de validation Chris/Gemini avant intégration dans `MODELISATION_UML.md`.

## 2026-06-14 05:02 (UTC+1) — [Claude] (validé [Gemini] à 100%)

- `DOMAIN_MODEL.md` **figé** : modèle financier intégré — `Fund` (caisse), `LedgerTransaction` (partie double, somme=0), `LedgerEntry` rattachée à Fund + `reversedEntryId`, `Contribution`/`Payout` mis à jour, `Obligation` unifie Penalty/Loan/SolidarityClaim. ER mis à jour, principe #8 ajouté.
- `MODELISATION_UML.md` : §3 → diagramme de classes du **Noyau financier validé** (3.1), ancien diagramme conservé en vue d'ensemble (3.2).
- `DECISIONS.md` : décisions #12–#14 (ordre de construction Web d'abord ; `Obligation` ; partie double).
- Acté : `DOMAIN.md` supprimé (Gemini), `DOMAIN_MODEL.md` = fichier domaine unique.

## 2026-06-14 04:29 (UTC+1) — [Claude] (intègre le retour [Gemini])

- `MODELISATION_UML.md` : cas d'utilisation **figés** en version complète (11 packages, vue d'ensemble validée, catalogue exhaustif). Ajouts Gemini intégrés : caisses internes + compensation (wallet), cession de part (« achat de la main »), parrainage multi-garants. Hors périmètre V1 acté : FX dynamique, P11 facturation auto.
- `DECISIONS.md` : décisions #8–#11 ajoutées ; question ouverte reformulée (périmètre vs ordre de construction).
- Clarification d'archi : package ≈ **module** NestJS (pas microservice) ; P4–P7 dans le seul service Core ACID.

## 2026-06-14 03:56 (UTC+1) — [Claude]

- Mise en place de la convention d'horodatage : création de ce `JOURNAL.md`, ajout d'un en-tête Révision sur `DOMAIN_MODEL.md`, `MODELISATION_UML.md`, `DECISIONS.md`.

## 2026-06-14 03:5x (UTC+1) — [Claude]

- Création de `MODELISATION_UML.md` : diagrammes cas d'utilisation, composants (microservices), classes (domaine), 3 séquences, 3 états. Classes + composants validés (rendu Mermaid OK).
- Création de `DECISIONS.md` (journal ADR) : stack NestJS microservices, cœur financier ACID unique, mono-devise, Strategy par type, etc.
- Mise à jour `DOMAIN_MODEL.md` : nom **Nkap**, stack **NestJS microservices** (remplace Express), garde-fou financier ACID.

## 2026-06-14 03:4x (UTC+1) — [Claude]

- Création de `DOMAIN_MODEL.md` : entités, principes non négociables (montants entiers, ledger append-only, multi-tenant), réponses aux 3 Open Questions, revue du plan Gemini.
