import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from './ledger.service';
import { DataSource } from 'typeorm';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TransactionType, EntryType } from '../../common/enums';
import { FundType } from '../../common/enums';
import { Fund } from '../tontine/fund.entity';
import { LedgerTransaction } from './ledger-transaction.entity';

describe('LedgerService', () => {
  let service: LedgerService;
  let mockQueryRunner: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordTransaction', () => {
    const dto = {
      idempotencyKey: 'test-key',
      tontineId: 'tontine-1',
      roundId: 'round-1',
      membershipId: 'member-1',
      type: TransactionType.CONTRIBUTION,
      amount: 1000,
      fundId: 'fund-1',
      entryType: EntryType.CREDIT,
    };

    it('should throw ConflictException if idempotencyKey exists', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce({}); // existing transaction

      await expect(service.recordTransaction(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if fund not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null); // existing transaction not found
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null); // fund not found

      await expect(service.recordTransaction(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should record transaction and ledger entries successfully', async () => {
      const mockFund = {
        id: 'fund-1',
        type: FundType.MAIN,
        cachedBalance: 500,
      } as Fund;

      const mockTx = { id: 'tx-1' } as LedgerTransaction;

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null); // existing transaction not found
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockFund); // fund found

      mockQueryRunner.manager.create.mockReturnValueOnce(mockTx); // transaction created
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockTx); // save transaction

      mockQueryRunner.manager.create.mockImplementation(
        (entityClass: any, data: any) => data,
      ); // mock create entry
      mockQueryRunner.manager.save.mockResolvedValue(true); // save fund and entries

      const result = await service.recordTransaction(dto);

      expect(result).toEqual(mockTx);
      expect(mockFund.cachedBalance).toBe(1500); // 500 + 1000
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if insufficient funds for DEBIT', async () => {
      const mockFund = {
        id: 'fund-1',
        type: FundType.MAIN,
        cachedBalance: 500, // less than 1000 required
      } as Fund;

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockFund);

      const debitDto = { ...dto, entryType: EntryType.DEBIT };

      await expect(service.recordTransaction(debitDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
