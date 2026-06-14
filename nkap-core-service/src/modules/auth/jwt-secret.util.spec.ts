import { ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from './jwt-secret.util';

const mkConfig = (secret?: string) =>
  ({ get: () => secret }) as unknown as ConfigService;

describe('resolveJwtSecret', () => {
  const prevEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  it('retourne le secret fourni', () => {
    expect(resolveJwtSecret(mkConfig('s3cr3t'))).toBe('s3cr3t');
  });

  it('échoue au démarrage en production si le secret est absent', () => {
    process.env.NODE_ENV = 'production';
    expect(() => resolveJwtSecret(mkConfig(undefined))).toThrow(/JWT_SECRET/);
  });

  it('tolère un secret par défaut hors production', () => {
    process.env.NODE_ENV = 'test';
    expect(resolveJwtSecret(mkConfig(undefined))).toBe('dev-secret-change-me');
  });
});
