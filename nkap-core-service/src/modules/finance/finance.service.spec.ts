import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionType } from '../../common/enums';
import { Fund } from '../tontine/fund.entity';
import { Membership } from '../tontine/membership.entity';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const buildDataSource = (opts: {
    member?: unknown;
    funds?: unknown[];
    ledger?: [unknown[], number];
  }) => {
    const membershipRepo = {
      findOne: jest.fn(async () => opts.member ?? null),
    };
    const fundRepo = { find: jest.fn(async () => opts.funds ?? []) };
    const ledgerRepo = {
      find: jest.fn(async () => opts.ledger?.[0] ?? []),
      findAndCount: jest.fn(async () => opts.ledger ?? [[], 0]),
    };
    const dataSource = {
      getRepository: jest.fn((e: unknown) => {
        if (e === Membership) return membershipRepo;
        if (e === Fund) return fundRepo;
        return ledgerRepo;
      }),
    } as unknown as DataSource;
    return { dataSource, ledgerRepo };
  };

  it('getFunds refuse un non-membre (403)', async () => {
    const { dataSource } = buildDataSource({ member: null });
    const service = new FinanceService(dataSource);
    await expect(service.getFunds('t1', 'u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getFunds renvoie les caisses pour un membre', async () => {
    const { dataSource } = buildDataSource({
      member: { id: 'm1' },
      funds: [{ type: 'MAIN' }, { type: 'SOCIAL' }],
    });
    const service = new FinanceService(dataSource);
    const res = await service.getFunds('t1', 'u1');
    expect(res).toHaveLength(2);
  });

  it('getLedger renvoie un résultat paginé', async () => {
    const { dataSource, ledgerRepo } = buildDataSource({
      member: { id: 'm1' },
      ledger: [[{ id: 'tx1' }], 1],
    });
    const service = new FinanceService(dataSource);
    const res = await service.getLedger('t1', 'u1', { limit: 10, offset: 0 });
    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.limit).toBe(10);
    expect(ledgerRepo.findAndCount).toHaveBeenCalled();
  });

  it('getContributions filtre par type CONTRIBUTION', async () => {
    const { dataSource, ledgerRepo } = buildDataSource({
      member: { id: 'm1' },
      ledger: [[{ id: 'c1' }], 1],
    });
    const service = new FinanceService(dataSource);
    await service.getContributions('t1', 'u1');
    expect(ledgerRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: TransactionType.CONTRIBUTION }),
      }),
    );
  });
});
