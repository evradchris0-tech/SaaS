# Plan d'Avancement Agile (Tranches Verticales)

## Philosophie Agile

Plutôt que de construire le backend "couche par couche" de façon invisible, nous adoptons une méthode **Agile en Tranches Verticales**. Chaque Sprint doit produire un **Incrément Livrable et Testable de bout en bout** (Base de données -> Logique -> API -> Test E2E).

À la fin de chaque Sprint, l'API sera fonctionnelle pour un cas d'usage précis.

---

### Sprint 1 : Onboarding & Coquille de Tontine

**Objectif :** Un utilisateur peut s'inscrire, se connecter et initialiser une tontine.

- **Fonctionnalités :**
  - Inscription et Connexion Utilisateur (`AuthService`, JWT).
  - Création d'une Organisation (Tenancy).
  - Création d'une Tontine (statut `DRAFT`) avec génération automatique de ses 4 Caisses (`Funds`).
- **Livrable (API) :** Le frontend ou Postman peut créer un compte utilisateur, obtenir un Token, et configurer la base d'une tontine.

### Sprint 2 : Adhésion & Lancement du Cycle (Moteur de Règles)

**Objectif :** Remplir la tontine et lancer le calendrier officiel.

- **Fonctionnalités :**
  - Ajout des membres (`Membership`) et gestion du "KYC" (parrainage de base).
  - Application du `RuleSet` via la `Strategy` (Calculs métier purs).
  - Lancement du cycle : Génération mathématique du calendrier des `Rounds` (échéances).
- **Livrable (API) :** Le président ajoute 5 membres, configure la fréquence (ex: hebdomadaire), et clique sur "Démarrer". L'API retourne les 5 prochains Rounds générés.

### Sprint 3 : Moteur Transactionnel (Paiement des Cotisations)

**Objectif :** Collecter l'argent de façon ultra-sécurisée.

- **Fonctionnalités :**
  - Le `LedgerService` : Comptabilité en partie double, immuabilité (La Fondation).
  - Le `ContributionService` : Permettre à un membre de payer sa part (`Contribution`).
  - L'Idempotence (pour éviter les doubles paiements réseau).
- **Livrable (API) :** Les membres voient leurs paiements en attente. Un paiement virtuel est effectué, et le solde de la Caisse Principale (`Fund.cachedBalance`) augmente, soutenu par le registre `Ledger`.

### Sprint 4 : Ramassage & Pénalités (Le Payout Net)

**Objectif :** Redistribuer l'argent et sanctionner les retards.

- **Fonctionnalités :**
  - Le `PayoutService` : Calcul du ramassage net.
  - Le système d'`Obligation` : Sanctions automatiques si la `dueDate` d'un Round est dépassée.
  - Déduction intelligente : Si un membre gagne le ramassage mais a des pénalités impayées, elles sont déduites à la source.
- **Livrable (API) :** Clôture d'un Round. Génération d'une amende pour un membre en retard, et paiement net au gagnant.

### Sprint 5 : Caisse de Secours & Prêts (ASCA et Gouvernance)

**Objectif :** Gérer les cas sociaux et les tontines avec épargne et crédits.

- **Fonctionnalités :**
  - Demande d'assistance (décès, maladie) et vote du bureau (`ApprovalService` avec Quorum).
  - Demande de prêt sur la Caisse d'Épargne avec taux d'intérêt simple/composé.
- **Livrable (API) :** Un membre obtient un prêt ou un décaissement social après vote de 3 membres du bureau.
