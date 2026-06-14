# Nkap — Plan de modélisation complète (définition de « terminé »)

> 🕒 **Révision** — MAJ : [Claude] 2026-06-14 06:20 (UTC+1) — **modélisation données + comportements VERROUILLÉE** ✅ (classes, séquences, états). Restent NON bloquants : diagramme de déploiement (infra) + glossaire. Journal : [JOURNAL.md](JOURNAL.md).
> Objectif (décision Chris) : **modéliser la solution complètement AVANT de coder.** Ce fichier = la checklist qui définit « modèle complet ». Statuts : ✅ figé · 🔄 validé, à intégrer · 🔶 draft (rendu à re-valider) · ⬜ à faire.

## Découpage en Bounded Contexts (DDD)

- **BC1 — Identité & Tenancy** : Organization, User, Membership, Role, Plan/Subscription, Sponsorship (garant)
- **BC2 — Configuration & Moteur de règles** : Tontine, TontineType/Strategy, RuleSet (+ sous-règles), Frequency, Fund
- **BC3 — Cycle & Bénéfice** : Round, Cycle, BeneficiaryAssignment, Auction/Bid, ShareTransfer
- **BC4 — Noyau financier & Registre** : Fund, LedgerTransaction, LedgerEntry, Contribution, Payout, Obligation
- **BC5 — Gouvernance & Audit** : Approval, Meeting/PV, Vote, AuditLog, Notification

## Checklist des artefacts

### Cas d'utilisation

- ✅ Vue d'ensemble + catalogue des 11 packages

### Architecture

- ✅ Diagramme de composants (microservices)
- ⬜ Diagramme de déploiement (infra : services, MySQL, broker, Angular, mobile)

### Diagrammes de classes (par BC)

- ✅ **BC4** Noyau financier (Fund, Ledger, Contribution, Payout)
- ✅ **BC2** Moteur de règles (Strategy + RuleSet complet : Contribution/Beneficiary/Penalty/Interest/Solidarity/Governance/Loan/PlatformFee/Default) — 🔒 verrouillé
- ✅ **BC1** Identité & Tenancy (Organization, Subscription, User, Membership, Sponsorship) — 🔒
- ✅ **BC3** Cycle & Bénéfice (Cycle, Round, BeneficiaryAssignment, Auction, Bid, ShareTransfer) — 🔒
- ✅ **BC4+** Obligations unifiées (Penalty/Loan/SolidarityClaim ⇒ `Obligation`)
- ✅ **BC5** Gouvernance & Audit (Approval, ApprovalVote, Meeting, Resolution, AuditLog, Notification) — 🔒

### Diagrammes de séquence

- ✅ Cotisation manuelle · ✅ Ramassage net · ✅ Paiement MoMo async
- ✅ Défaut membre (waterfall) · ✅ Créer & configurer une tontine
- ✅ Onboarding (multi-garants) · ✅ Round à enchères · ✅ Prêt (cycle complet)
- ✅ Réclamation de solidarité · ✅ Cession de part · ✅ Pénalité · ✅ Contre-passation

### Diagrammes d'états

- ✅ Tontine · ✅ Round · ✅ Cotisation/Paiement
- ✅ Obligation/Loan · ✅ Membership · ✅ Approval · ✅ Auction

### Transverse

- ⬜ **Glossaire / langage ubiquitaire** (FR/EN) — vocabulaire partagé du trinôme
- ⬜ Modèle physique (ERD) — dérivé des diagrammes de classes

## Cadence proposée

Un **bounded context par itération**, validé par Chris + Gemini avant d'intégrer et de passer au suivant. (Chris peut demander de batcher plusieurs BC d'un coup.)
Ordre proposé : **BC2 (en cours)** → BC1 → BC3 → BC4+ (Obligations) → BC5 → séquences → états → glossaire → déploiement.
