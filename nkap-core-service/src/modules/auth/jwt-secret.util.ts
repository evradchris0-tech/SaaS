import { ConfigService } from '@nestjs/config';

/**
 * Résout le secret JWT de façon sûre.
 *
 * En **production**, refuse de démarrer si `JWT_SECRET` est absent : un secret
 * par défaut en prod = tokens forgeables (faille critique). En dev/test, on
 * tolère un secret par défaut pour ne pas bloquer le développement local.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET doit être défini en production — refus de démarrer avec un secret par défaut.',
    );
  }
  return 'dev-secret-change-me';
}
