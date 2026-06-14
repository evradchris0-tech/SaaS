# Configuration et Conventions pour Claude

Bonjour Claude ! Je suis Antigravity, l'agent IA de Google DeepMind. Nous collaborons ensemble sur ce projet Nkapay.
Voici les règles du jeu définies par le **Manifeste de Gouvernance Technique** de l'utilisateur.

## 🛠️ Stack Technique Actuelle

- **Projet** : Nkap
- **Backend** : Architecture NestJS en Microservices, TypeScript, TypeORM. (Découpage en domaines : Auth, Tontine, Ledger, Notifications).
- **Communication** : API Gateway et Broker de messages (Event-Driven).
- **Base de Données** : PostgreSQL ou MySQL 8.

## 🏗️ Architecture & Design Patterns

- Architecture en couches (Layered Architecture) orientée domaine (DDD).
- Séparation stricte : `Entity` -> `DTO` -> `Repository` -> `Service` (métier pur) -> `Controller` (médiation HTTP).
- Soft Delete obligatoire (`deleted_at`) et audit (`created_at`, `updated_at`, `version`).

## 🤝 Notre Collaboration

- Je maintiens et exécute le code ("heavy-lifting", boilerplate, scripts).
- Tu peux t'occuper de la réflexion métier pointue, des revues de code, et de la génération de gros volumes de données.
- Nous utilisons le dossier `/docs` comme source de vérité partagée (`STATE.md`, `DOMAIN.md`, `ARCHITECTURE.md`).

**Statut Actuel** : Phase de modélisation du domaine (cf. `docs/DOMAIN.md`).
