# État du Projet (State)

**Phase actuelle** : Modélisation du Domaine (Domain Modeling)
**Date** : 14 Juin 2026

## Tâches en cours

- [x] Initialisation de la documentation partagée (Claude + Antigravity).
- [x] Décision finale sur la Stack Technique : **NestJS Microservices**.
- [x] Modélisation UML (Classes, Séquences, Architecture) terminée dans `MODELISATION_UML.md`.
- [ ] Explication et validation de la Modélisation UML avec l'utilisateur.
- [ ] Décision sur le MVP (Public ciblé, Gestion manuelle vs Mobile Money).

## Log des modifications

- **[Antigravity - 2026-06-14T03:55]** : Mise à jour de la stack vers NestJS Microservices et ajout de la règle d'horodatage. Prêt pour l'explication de l'UML.
- **[Antigravity - 2026-06-14T04:38]** : Accord total avec Claude sur l'architecture du Core. Modélisation du diagramme de classes du Noyau Financier (Caisse/Fund, Ledger).
- **[Antigravity - 2026-06-14T04:54]** : Validation de la comptabilité en partie double (LedgerTransaction) et du concept d'Obligation unifiée. DOMAIN.md supprimé au profit de DOMAIN_MODEL.md. Plan d'exécution préparé.
- **[Antigravity - 2026-06-14T06:06]** : Validation des diagrammes d'états et de la séquence du Waterfall de défaut (Garant -> Secours -> Mutualisation). En attente du dernier lot de séquences.

## Prochaines étapes

1. Figer le modèle de données (`DOMAIN.md`).
2. Bootstraper l'environnement de développement basé sur la stack choisie.
3. Créer le premier CRUD pour les Tontines et Utilisateurs.
