import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from '../../modules/auth/dto/register.dto';
import { CreateTontineDto } from '../../modules/tontine/dto/create-tontine.dto';
import { ContributeDto } from '../../modules/tontine/dto/contribute.dto';
import { AddMemberDto } from '../../modules/tontine/dto/add-member.dto';
import { TontineType } from '../enums';

/**
 * Tests de validation des DTO (couche d'entrée). On reproduit les options du
 * ValidationPipe global (whitelist + forbidNonWhitelisted) pour garantir que
 * les contrats d'API rejettent toute entrée malformée — en particulier le
 * `ruleSet` qui protège le moteur de calcul financier.
 */
const PIPE_OPTS = { whitelist: true, forbidNonWhitelisted: true };

const validRuleSet = {
  contribution: {
    amountPerShare: 10000,
    frequency: { interval: 1, unit: 'MONTH' },
    allowAdvance: false,
  },
  beneficiary: { order: 'FIXED', allowSwap: false },
  penalty: { type: 'FIXED', value: 500, graceDays: 3 },
};

const validCreateTontine = {
  organizationId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Tontine Familiale',
  type: TontineType.ROTATING,
  currency: 'XAF',
  ruleSet: validRuleSet,
};

describe('Validation DTO (couche entrée)', () => {
  describe('RegisterDto', () => {
    it('accepte un payload valide', async () => {
      const dto = plainToInstance(RegisterDto, {
        phone: '+237600000000',
        fullName: 'John Doe',
        password: 'StrongPass123!',
      });
      expect(await validate(dto, PIPE_OPTS)).toHaveLength(0);
    });

    it('rejette un mot de passe trop court', async () => {
      const dto = plainToInstance(RegisterDto, {
        phone: '+237600000000',
        fullName: 'John Doe',
        password: 'short',
      });
      const errors = await validate(dto, PIPE_OPTS);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('rejette un téléphone invalide', async () => {
      const dto = plainToInstance(RegisterDto, {
        phone: 'not-a-phone',
        fullName: 'John Doe',
        password: 'StrongPass123!',
      });
      expect(
        (await validate(dto, PIPE_OPTS)).some((e) => e.property === 'phone'),
      ).toBe(true);
    });
  });

  describe('CreateTontineDto', () => {
    it('accepte un payload valide (ruleSet imbriqué)', async () => {
      const dto = plainToInstance(CreateTontineDto, validCreateTontine);
      expect(await validate(dto, PIPE_OPTS)).toHaveLength(0);
    });

    it('rejette une devise non ISO (longueur ≠ 3)', async () => {
      const dto = plainToInstance(CreateTontineDto, {
        ...validCreateTontine,
        currency: 'EURO',
      });
      expect(
        (await validate(dto, PIPE_OPTS)).some((e) => e.property === 'currency'),
      ).toBe(true);
    });

    it('rejette un type de tontine inconnu', async () => {
      const dto = plainToInstance(CreateTontineDto, {
        ...validCreateTontine,
        type: 'PYRAMID',
      });
      expect(
        (await validate(dto, PIPE_OPTS)).some((e) => e.property === 'type'),
      ).toBe(true);
    });

    it('rejette un ruleSet avec amountPerShare négatif (protège le moteur)', async () => {
      const dto = plainToInstance(CreateTontineDto, {
        ...validCreateTontine,
        ruleSet: {
          ...validRuleSet,
          contribution: { ...validRuleSet.contribution, amountPerShare: -100 },
        },
      });
      expect(await validate(dto, PIPE_OPTS)).not.toHaveLength(0);
    });

    it('rejette un ruleSet avec une unité de fréquence invalide', async () => {
      const dto = plainToInstance(CreateTontineDto, {
        ...validCreateTontine,
        ruleSet: {
          ...validRuleSet,
          contribution: {
            ...validRuleSet.contribution,
            frequency: { interval: 1, unit: 'YEAR' },
          },
        },
      });
      expect(await validate(dto, PIPE_OPTS)).not.toHaveLength(0);
    });

    it('rejette un ruleSet incomplet (penalty manquant)', async () => {
      const partialRuleSet = {
        contribution: validRuleSet.contribution,
        beneficiary: validRuleSet.beneficiary,
      };
      const dto = plainToInstance(CreateTontineDto, {
        ...validCreateTontine,
        ruleSet: partialRuleSet,
      });
      expect(await validate(dto, PIPE_OPTS)).not.toHaveLength(0);
    });
  });

  describe('ContributeDto', () => {
    const base = {
      roundId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      membershipId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      amount: 10000,
    };

    it('accepte un payload valide', async () => {
      expect(
        await validate(plainToInstance(ContributeDto, base), PIPE_OPTS),
      ).toHaveLength(0);
    });

    it('rejette un montant nul ou négatif', async () => {
      const errors = await validate(
        plainToInstance(ContributeDto, { ...base, amount: 0 }),
        PIPE_OPTS,
      );
      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });

    it('rejette un montant non entier', async () => {
      const errors = await validate(
        plainToInstance(ContributeDto, { ...base, amount: 99.99 }),
        PIPE_OPTS,
      );
      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });

    it('rejette un champ inconnu (forbidNonWhitelisted)', async () => {
      const errors = await validate(
        plainToInstance(ContributeDto, { ...base, hacker: 'x' }),
        PIPE_OPTS,
      );
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('AddMemberDto', () => {
    it('rejette un userId non-UUID', async () => {
      const errors = await validate(
        plainToInstance(AddMemberDto, { userId: 'not-uuid' }),
        PIPE_OPTS,
      );
      expect(errors.some((e) => e.property === 'userId')).toBe(true);
    });
  });
});
