import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrgRole } from '../../common/enums';
import { OrganizationMembership } from './organization-membership.entity';
import { Organization } from './organization.entity';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  describe('create', () => {
    it('crée l’organisation et le créateur comme OWNER', async () => {
      const created: Array<{ entity: unknown; value: any }> = [];
      const manager = {
        create: jest.fn((entity: unknown, value: any) => {
          created.push({ entity, value });
          return value;
        }),
        save: jest.fn(async (x: any) => ({ id: x.id ?? 'org1', ...x })),
      };
      const dataSource = {
        transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      } as unknown as DataSource;

      const service = new OrganizationsService(dataSource);
      const org: any = await service.create({ name: 'Org' }, 'user-1');

      expect(org.id).toBe('org1');
      expect(created.filter((c) => c.entity === Organization)).toHaveLength(1);
      const memCalls = created.filter(
        (c) => c.entity === OrganizationMembership,
      );
      expect(memCalls).toHaveLength(1);
      expect(memCalls[0].value).toMatchObject({
        userId: 'user-1',
        role: OrgRole.OWNER,
      });
    });
  });

  describe('addMember', () => {
    const buildDS = (opts: {
      org: unknown;
      requesterRole?: OrgRole | null;
      existing?: unknown;
    }) => {
      const orgRepo = { findOne: jest.fn(async () => opts.org) };
      const memRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(
            opts.requesterRole === null
              ? null
              : { role: opts.requesterRole ?? OrgRole.OWNER },
          )
          .mockResolvedValueOnce(opts.existing ?? null),
        create: jest.fn((v: unknown) => v),
        save: jest.fn(async (v: unknown) => ({
          id: 'om-new',
          ...(v as object),
        })),
      };
      const dataSource = {
        getRepository: jest.fn((e: unknown) =>
          e === Organization ? orgRepo : memRepo,
        ),
      } as unknown as DataSource;
      return { dataSource, memRepo };
    };

    it('rattache un MEMBER quand le demandeur est OWNER', async () => {
      const { dataSource, memRepo } = buildDS({
        org: { id: 'org1' },
        requesterRole: OrgRole.OWNER,
      });
      const service = new OrganizationsService(dataSource);

      const res: any = await service.addMember(
        'org1',
        { userId: 'u2' },
        'owner-1',
      );

      expect(memRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u2', role: OrgRole.MEMBER }),
      );
      expect(res.id).toBe('om-new');
    });

    it('refuse si le demandeur n’est pas OWNER/ADMIN (403)', async () => {
      const { dataSource } = buildDS({
        org: { id: 'org1' },
        requesterRole: OrgRole.MEMBER,
      });
      const service = new OrganizationsService(dataSource);

      await expect(
        service.addMember('org1', { userId: 'u2' }, 'member-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('renvoie 404 si l’organisation est introuvable', async () => {
      const { dataSource } = buildDS({ org: null });
      const service = new OrganizationsService(dataSource);

      await expect(
        service.addMember('orgX', { userId: 'u2' }, 'owner-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse un doublon de membre (409)', async () => {
      const { dataSource } = buildDS({
        org: { id: 'org1' },
        requesterRole: OrgRole.ADMIN,
        existing: { id: 'om0' },
      });
      const service = new OrganizationsService(dataSource);

      await expect(
        service.addMember('org1', { userId: 'u2' }, 'admin-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('assertOrgRole', () => {
    const dsWith = (membership: unknown) =>
      ({
        getRepository: jest.fn(() => ({
          findOne: jest.fn(async () => membership),
        })),
      }) as unknown as DataSource;

    it('refuse un non-membre (403)', async () => {
      const service = new OrganizationsService(dsWith(null));
      await expect(service.assertOrgRole('org1', 'u1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('refuse un rôle insuffisant (403)', async () => {
      const service = new OrganizationsService(
        dsWith({ role: OrgRole.MEMBER }),
      );
      await expect(
        service.assertOrgRole('org1', 'u1', [OrgRole.OWNER]),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('passe pour un membre avec le bon rôle', async () => {
      const service = new OrganizationsService(dsWith({ role: OrgRole.OWNER }));
      await expect(
        service.assertOrgRole('org1', 'u1', [OrgRole.OWNER, OrgRole.ADMIN]),
      ).resolves.toBeUndefined();
    });
  });
});
