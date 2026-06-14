import { BigIntTransformer } from './column-numeric.transformer';

describe('BigIntTransformer', () => {
  const t = new BigIntTransformer();

  it('sérialise un number en string pour la base', () => {
    expect(t.to(1500)).toBe('1500');
    expect(t.to(0)).toBe('0');
  });

  it('désérialise un string bigint en number', () => {
    expect(t.from('1500')).toBe(1500);
  });

  it('gère null et undefined dans les deux sens', () => {
    expect(t.to(null)).toBeNull();
    expect(t.to(undefined)).toBeNull();
    expect(t.from(null)).toBeNull();
    expect(t.from(undefined)).toBeNull();
  });

  it('régression : additionne sans concaténer (1000 + 500 = 1500, pas "1000500")', () => {
    const a = t.from('1000') as number;
    const b = t.from('500') as number;
    expect(a + b).toBe(1500);
  });

  it('lève une erreur au-delà de MAX_SAFE_INTEGER (protection précision argent)', () => {
    expect(() => t.from('9007199254740993')).toThrow(/MAX_SAFE_INTEGER/);
  });
});
