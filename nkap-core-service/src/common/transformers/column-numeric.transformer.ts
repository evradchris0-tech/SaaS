import { ValueTransformer } from 'typeorm';

/**
 * Transformer pour les colonnes monétaires stockées en `bigint`
 * (montants en plus petite unité de devise, ex. FCFA = entier).
 *
 * Pourquoi c'est indispensable : TypeORM hydrate les colonnes `bigint`
 * en `string` par défaut (pour éviter la perte de précision au-delà de
 * 2^53). Sans ce transformer, additionner deux soldes (`a + b`) concatène
 * des chaînes ("1000" + "500" = "1000500") — un bug silencieux sur de
 * l'argent. À utiliser sur TOUTES les colonnes monétaires.
 *
 * Garde-fou : au-delà de Number.MAX_SAFE_INTEGER on lève une erreur
 * plutôt que de perdre silencieusement de la précision.
 */
export class BigIntTransformer implements ValueTransformer {
  to(value?: number | null): string | null {
    if (value === null || value === undefined) return null;
    return String(value);
  }

  from(value?: string | null): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw new Error(
        `Montant "${value}" dépasse Number.MAX_SAFE_INTEGER — basculer sur BigInt pour cette valeur.`,
      );
    }
    return parsed;
  }
}
