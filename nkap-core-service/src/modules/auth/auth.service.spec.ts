import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const makeUsers = (overrides: Partial<Record<string, jest.Mock>> = {}) => ({
    findOne: jest.fn(),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: any) => ({ id: 'user-uuid', ...v })),
    ...overrides,
  });
  const makeRefreshTokens = (
    overrides: Partial<Record<string, jest.Mock>> = {},
  ) => ({
    findOne: jest.fn(async () => null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: any) => ({ id: 'rt-uuid', ...v })),
    ...overrides,
  });
  const jwt = { sign: jest.fn(() => 'signed.jwt.token') };
  const config = { get: jest.fn((_k: string, def?: string) => def) };

  const build = (
    users: ReturnType<typeof makeUsers>,
    refreshTokens: ReturnType<typeof makeRefreshTokens> = makeRefreshTokens(),
  ) =>
    new AuthService(
      users as any,
      refreshTokens as any,
      jwt as any,
      config as any,
    );

  it('register : hash le mot de passe et renvoie access + refresh', async () => {
    const users = makeUsers({ findOne: jest.fn(async () => null) });
    const refreshTokens = makeRefreshTokens();
    const service = build(users, refreshTokens);

    const res = await service.register({
      phone: '+237690000000',
      fullName: 'Chris O.',
      password: 'motdepasse1',
    });

    expect(res.accessToken).toBe('signed.jwt.token');
    expect(res.refreshToken).toEqual(expect.any(String));
    expect(refreshTokens.save).toHaveBeenCalledTimes(1);
    const created = users.create.mock.calls[0][0] as { passwordHash: string };
    expect(await bcrypt.compare('motdepasse1', created.passwordHash)).toBe(
      true,
    );
  });

  it('register : refuse un téléphone déjà pris', async () => {
    const users = makeUsers({ findOne: jest.fn(async () => ({ id: 'x' })) });
    await expect(
      build(users).register({
        phone: '+237690000000',
        fullName: 'X',
        password: 'motdepasse1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login : rejette un mauvais mot de passe', async () => {
    const passwordHash = await bcrypt.hash('bonmotdepasse', 12);
    const users = makeUsers({
      findOne: jest.fn(async () => ({
        id: 'u',
        phone: '+237690000000',
        passwordHash,
      })),
    });
    await expect(
      build(users).login({ phone: '+237690000000', password: 'mauvais' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('refresh', () => {
    it('rejette un token inconnu', async () => {
      const refreshTokens = makeRefreshTokens({
        findOne: jest.fn(async () => null),
      });
      await expect(
        build(makeUsers(), refreshTokens).refresh('inconnu'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejette un token révoqué', async () => {
      const refreshTokens = makeRefreshTokens({
        findOne: jest.fn(async () => ({
          userId: 'u',
          expiresAt: new Date(Date.now() + 100000),
          revokedAt: new Date(),
        })),
      });
      await expect(
        build(makeUsers(), refreshTokens).refresh('x'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejette un token expiré', async () => {
      const refreshTokens = makeRefreshTokens({
        findOne: jest.fn(async () => ({
          userId: 'u',
          expiresAt: new Date(Date.now() - 1000),
          revokedAt: null,
        })),
      });
      await expect(
        build(makeUsers(), refreshTokens).refresh('x'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('valide : révoque l’ancien et émet un nouveau couple', async () => {
      const stored: any = {
        userId: 'u',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      };
      const refreshTokens = makeRefreshTokens({
        findOne: jest.fn(async () => stored),
      });
      const users = makeUsers({
        findOne: jest.fn(async () => ({ id: 'u', phone: '+237690000000' })),
      });
      const res = await build(users, refreshTokens).refresh('valide');

      expect(stored.revokedAt).toBeInstanceOf(Date); // ancien révoqué
      expect(res.accessToken).toBe('signed.jwt.token');
      expect(res.refreshToken).toEqual(expect.any(String));
    });
  });

  describe('logout', () => {
    it('révoque le token s’il existe', async () => {
      const stored: any = { revokedAt: null };
      const refreshTokens = makeRefreshTokens({
        findOne: jest.fn(async () => stored),
      });
      await build(makeUsers(), refreshTokens).logout('x');
      expect(stored.revokedAt).toBeInstanceOf(Date);
      expect(refreshTokens.save).toHaveBeenCalled();
    });
  });
});
