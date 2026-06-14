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
  const jwt = { sign: jest.fn(() => 'signed.jwt.token') };

  it('register : hash le mot de passe et renvoie un token', async () => {
    const users = makeUsers({ findOne: jest.fn(async () => null) });
    const service = new AuthService(users as any, jwt as any);

    const res = await service.register({
      phone: '+237690000000',
      fullName: 'Chris O.',
      password: 'motdepasse1',
    });

    expect(res.accessToken).toBe('signed.jwt.token');
    const created = users.create.mock.calls[0][0];
    expect(created.passwordHash).not.toBe('motdepasse1'); // hashé
    expect(await bcrypt.compare('motdepasse1', created.passwordHash)).toBe(
      true,
    );
  });

  it('register : refuse un téléphone déjà pris', async () => {
    const users = makeUsers({ findOne: jest.fn(async () => ({ id: 'x' })) });
    const service = new AuthService(users as any, jwt as any);
    await expect(
      service.register({
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
    const service = new AuthService(users as any, jwt as any);
    await expect(
      service.login({ phone: '+237690000000', password: 'mauvais' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
