# Politique de sécurité

## Signaler une vulnérabilité

Ne pas ouvrir d'issue publique. Contacter en privé le mainteneur (`@evradchris0-tech`) avec le détail et un PoC si possible. Réponse visée sous 72h.

## Règles

- **Aucun secret** dans le dépôt (clés, mots de passe, tokens). Seul `.env.example` est commité.
- Les dépendances sont surveillées par **Dependabot** + `npm audit` en CI.
- Données financières : registre **append-only**, montants en entiers, accès tracé (`AuditLog`).
