import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TontinesService } from './tontines.service';
import { Tontine } from './tontine.entity';
import { Fund } from './fund.entity';
import { Round } from './round.entity';
import { Membership } from './membership.entity';
import { Role, TontineType, TontineStatus } from '../../common/enums';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { RoundGeneratorService } from './services/round-generator.service';

const makeRoundGen = () =>
  ({
    generateSchedule: jest.fn(() => [{ index: 1 }, { index: 2 }]),
  }) as unknown as RoundGeneratorService;

const CREATOR_ID = '99999999-9999-9999-9999-999999999999';

describe('TontinesService', () => {
  describe('create', () => {
    it('crée une tontine DRAFT, ses 4 caisses et le Président (créateur)', async () => {
      const created: Array<{ entity: unknown; value: any }> = [];
      const manager = {
        // L'utilisateur appartient bien à l'organisation (enforcement multi-tenant).
        findOne: jest.fn(async () => ({ id: 'om1' })),
        create: jest.fn((entity: unknown, value: unknown) => {
          created.push({ entity, value });
          return value;
        }),
        save: jest.fn(async (x: unknown) => x),
      };
      const dataSource = {
        transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      } as unknown as DataSource;

      const service = new TontinesService(dataSource, makeRoundGen());
      const dto: CreateTontineDto = {
        organizationId: '11111111-1111-1111-1111-111111111111',
        name: 'Njangi des amis',
        type: TontineType.ROTATING,
        currency: 'XAF',
        ruleSet: {} as never,
      };

      await service.create(dto, CREATOR_ID);

      const tontineCalls = created.filter((c) => c.entity === Tontine);
      expect(tontineCalls).toHaveLength(1);
      expect(tontineCalls[0].value.status).toBe(TontineStatus.DRAFT);

      const fundCalls = created.filter((c) => c.entity === Fund);
      expect(fundCalls).toHaveLength(4);
      expect(fundCalls.map((c) => c.value.type).sort()).toEqual(
        ['MAIN', 'PENALTY', 'PLATFORM', 'SOCIAL'].sort(),
      );

      const membershipCalls = created.filter((c) => c.entity === Membership);
      expect(membershipCalls).toHaveLength(1);
      expect(membershipCalls[0].value).toMatchObject({
        userId: CREATOR_ID,
        role: Role.PRESIDENT,
        status: 'ACTIVE',
      });
    });

    it('refuse la création si le créateur n’appartient pas à l’organisation (403)', async () => {
      const manager = {
        findOne: jest.fn(async () => null),
        create: jest.fn((_e: unknown, v: unknown) => v),
        save: jest.fn(async (x: unknown) => x),
      };
      const dataSource = {
        transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      } as unknown as DataSource;
      const service = new TontinesService(dataSource, makeRoundGen());
      const dto: CreateTontineDto = {
        organizationId: '11111111-1111-1111-1111-111111111111',
        name: 'X',
        type: TontineType.ROTATING,
        currency: 'XAF',
        ruleSet: {} as never,
      };

      await expect(service.create(dto, CREATOR_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('addMember', () => {
    const buildDataSource = (overrides: {
      tontine?: unknown;
      requesterRole?: Role | null;
      existingMember?: unknown;
    }) => {
      const tontineRepo = {
        findOne: jest.fn(async () => overrides.tontine ?? null),
      };
      // 1er findOne = vérif du rôle du demandeur (assertMembershipRole) ;
      // 2e findOne = détection de doublon.
      const membershipRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(
            overrides.requesterRole === null
              ? null
              : { role: overrides.requesterRole ?? Role.PRESIDENT },
          )
          .mockResolvedValueOnce(overrides.existingMember ?? null),
        create: jest.fn((v: unknown) => v),
        save: jest.fn(async (v: unknown) => ({
          id: 'new-mem',
          ...(v as object),
        })),
      };
      const dataSource = {
        getRepository: jest.fn((entity: unknown) =>
          entity === Tontine ? tontineRepo : membershipRepo,
        ),
      } as unknown as DataSource;
      return { dataSource, membershipRepo };
    };

    it('ajoute un membre MEMBER quand le demandeur est Président', async () => {
      const { dataSource, membershipRepo } = buildDataSource({
        tontine: { id: 't1', status: TontineStatus.DRAFT },
        requesterRole: Role.PRESIDENT,
      });
      const service = new TontinesService(dataSource, makeRoundGen());

      const result: any = await service.addMember(
        't1',
        { userId: '22222222-2222-2222-2222-222222222222' },
        'pres-1',
      );

      expect(membershipRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.MEMBER, status: 'ACTIVE' }),
      );
      expect(result.id).toBe('new-mem');
    });

    it('refuse l’ajout par un non-président (403)', async () => {
      const { dataSource } = buildDataSource({
        tontine: { id: 't1', status: TontineStatus.DRAFT },
        requesterRole: Role.MEMBER,
      });
      const service = new TontinesService(dataSource, makeRoundGen());

      await expect(
        service.addMember('t1', { userId: 'u2' }, 'member-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse un doublon de membre (409)', async () => {
      const { dataSource } = buildDataSource({
        tontine: { id: 't1', status: TontineStatus.DRAFT },
        requesterRole: Role.PRESIDENT,
        existingMember: { id: 'm0' },
      });
      const service = new TontinesService(dataSource, makeRoundGen());

      await expect(
        service.addMember('t1', { userId: 'u2' }, 'pres-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('activate', () => {
    const buildManager = (members: unknown[]) => {
      const tontine: any = {
        id: 't1',
        type: TontineType.ROTATING,
        status: TontineStatus.DRAFT,
      };
      return {
        findOne: jest.fn(async () => tontine),
        find: jest.fn(async () => members),
        save: jest.fn(async (a: unknown, b?: unknown) => b ?? a),
      };
    };

    it('génère les rounds et passe ACTIVE quand le Président active', async () => {
      const manager = buildManager([
        { id: 'm1', userId: CREATOR_ID, role: Role.PRESIDENT },
        { id: 'm2', userId: 'u2', role: Role.MEMBER },
      ]);
      const dataSource = {
        transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      } as unknown as DataSource;
      const roundGen = makeRoundGen();

      const service = new TontinesService(dataSource, roundGen);
      const result: any = await service.activate('t1', new Date(), CREATOR_ID);

      expect(roundGen.generateSchedule).toHaveBeenCalledTimes(1);
      expect(manager.save).toHaveBeenCalledWith(Round, expect.any(Array));
      expect(result.status).toBe(TontineStatus.ACTIVE);
    });

    it('refuse l’activation par un non-président (403)', async () => {
      const manager = buildManager([
        { id: 'm1', userId: CREATOR_ID, role: Role.PRESIDENT },
        { id: 'm2', userId: 'u2', role: Role.MEMBER },
      ]);
      const dataSource = {
        transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      } as unknown as DataSource;

      const service = new TontinesService(dataSource, makeRoundGen());

      await expect(
        service.activate('t1', new Date(), 'u2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assertMembershipRole', () => {
    const buildDataSource = (membership: unknown) => {
      const repo = { findOne: jest.fn(async () => membership) };
      return {
        getRepository: jest.fn(() => repo),
      } as unknown as DataSource;
    };

    it('passe quand le membre possède un rôle autorisé', async () => {
      const service = new TontinesService(
        buildDataSource({ role: Role.TREASURER }),
        makeRoundGen(),
      );
      await expect(
        service.assertMembershipRole('t1', 'u1', [
          Role.PRESIDENT,
          Role.TREASURER,
        ]),
      ).resolves.toEqual(expect.objectContaining({ role: Role.TREASURER }));
    });

    it('passe pour tout membre quand aucun rôle n’est exigé', async () => {
      const service = new TontinesService(
        buildDataSource({ role: Role.MEMBER }),
        makeRoundGen(),
      );
      await expect(service.assertMembershipRole('t1', 'u1')).resolves.toEqual(
        expect.objectContaining({ role: Role.MEMBER }),
      );
    });

    it('refuse un non-membre (403)', async () => {
      const service = new TontinesService(
        buildDataSource(null),
        makeRoundGen(),
      );
      await expect(
        service.assertMembershipRole('t1', 'u1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse un rôle insuffisant (403)', async () => {
      const service = new TontinesService(
        buildDataSource({ role: Role.MEMBER }),
        makeRoundGen(),
      );
      await expect(
        service.assertMembershipRole('t1', 'u1', [Role.PRESIDENT]),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('Reads', () => {
    it('findAllForUser lists tontines', async () => {
      const mockMembershipRepo = {
        find: jest.fn().mockResolvedValue([{ tontineId: 't1' }]),
      };
      const mockTontineRepo = {
        find: jest.fn().mockResolvedValue([{ id: 't1' }]),
      };
      const dataSource = {
        getRepository: jest.fn((entity) =>
          entity === Membership ? mockMembershipRepo : mockTontineRepo,
        ),
      } as unknown as DataSource;
      const service = new TontinesService(dataSource, makeRoundGen());
      const res = await service.findAllForUser('u1');
      expect(res).toHaveLength(1);
    });
  });

  describe('updateRules', () => {
    it('refuses if not DRAFT', async () => {
      const service = new TontinesService({} as any, makeRoundGen());
      jest.spyOn(service, 'assertMembershipRole').mockResolvedValue();
      jest
        .spyOn(service, 'findOneScoped')
        .mockResolvedValue({ status: TontineStatus.ACTIVE } as any);
      await expect(service.updateRules('t1', 'u1', {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('removeMember', () => {
    it('refuses auto-exclusion of president', async () => {
      const service = new TontinesService({} as any, makeRoundGen());
      jest.spyOn(service, 'assertMembershipRole').mockResolvedValue();
      jest
        .spyOn(service, 'findOneScoped')
        .mockResolvedValue({ status: TontineStatus.DRAFT } as any);
      const mockMembershipRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'm1', userId: 'u1' }),
      };
      (service as any).dataSource = { getRepository: () => mockMembershipRepo };
      await expect(
        service.removeMember('t1', 'm1', 'u1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('cancelTontine', () => {
    it('cancels a DRAFT tontine to CANCELLED', async () => {
      const saveSpy = jest.fn();
      const mockTontineRepo = { save: saveSpy };
      const service = new TontinesService({} as any, makeRoundGen());
      jest.spyOn(service, 'assertMembershipRole').mockResolvedValue();
      jest
        .spyOn(service, 'findOneScoped')
        .mockResolvedValue({ id: 't1', status: TontineStatus.DRAFT } as any);
      (service as any).dataSource = { getRepository: () => mockTontineRepo };

      await service.cancelTontine('t1', 'u1');
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: TontineStatus.CANCELLED }),
      );
    });
  });
});
