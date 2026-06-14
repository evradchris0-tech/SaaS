## Objectif

<!-- Quel problème / quelle feature ? Référence DECISIONS.md #N ou ticket si applicable. -->

## Changements

-

## Definition of Done

- [ ] Lint + typecheck OK (`npm run lint`, `npx tsc --noEmit`)
- [ ] Tests ajoutés / à jour et verts (`npm test`)
- [ ] Aucun secret commité ; `.env.example` à jour si nouvelle variable
- [ ] Montants en **entiers** (plus petite unité) + `BigIntTransformer` sur toute colonne d'argent
- [ ] Migration TypeORM générée si le schéma change (jamais `synchronize` en prod)
- [ ] `JOURNAL.md` / `DECISIONS.md` à jour si décision ou modèle impacté

## Preuve (capture, log, ou sortie d'API si pertinent)
