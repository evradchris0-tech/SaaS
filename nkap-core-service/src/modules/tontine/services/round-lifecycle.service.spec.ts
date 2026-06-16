import { Test, TestingModule } from '@nestjs/testing';
import { RoundLifecycleService } from './round-lifecycle.service';
import { TontinesService } from '../tontines.service';
import { LedgerService } from '../../ledger/ledger.service';
import { DataSource } from 'typeorm';
import { RoundStatus, TontineStatus, Role } from '../../../common/enums';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Round } from '../round.entity';
import { Tontine } from '../tontine.entity';

describe('RoundLifecycleService', () => {
  let service: RoundLifecycleService;
  let tontinesService: Partial<TontinesService>;
  let ledgerService: Partial<LedgerService>;
  let manager: any;
  let queryRunner: any;

  beforeEach(async () => {
    tontinesService = {
      assertMembershipRole: jest
        .fn()
        .mockResolvedValue({ id: 'm1', role: Role.PRESIDENT }),
    };

    ledgerService = {
      recordTransaction: jest.fn(),
    };

    manager = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };

    const dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundLifecycleService,
        { provide: TontinesService, useValue: tontinesService },
        { provide: LedgerService, useValue: ledgerService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RoundLifecycleService>(RoundLifecycleService);
  });

  describe('closeCycle', () => {
    it('throws BadRequestException if tontine is not ACTIVE', async () => {
      manager.findOne.mockResolvedValueOnce({
        status: TontineStatus.DRAFT,
      });

      await expect(service.closeCycle('t1', 'r1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException if round not found', async () => {
      manager.findOne.mockResolvedValueOnce({
        status: TontineStatus.ACTIVE,
      });
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.closeCycle('t1', 'r1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws BadRequestException if round is not PAID', async () => {
      manager.findOne.mockResolvedValueOnce({
        status: TontineStatus.ACTIVE,
      });
      manager.findOne.mockResolvedValueOnce({
        status: RoundStatus.COLLECTING,
      });

      await expect(service.closeCycle('t1', 'r1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('closes round and opens next round if next round exists', async () => {
      const currentRound = {
        id: 'r1',
        index: 1,
        status: RoundStatus.PAID,
      } as Round;
      const nextRound = {
        id: 'r2',
        index: 2,
        status: RoundStatus.SCHEDULED,
      } as Round;

      manager.findOne
        .mockResolvedValueOnce({ status: TontineStatus.ACTIVE })
        .mockResolvedValueOnce(currentRound)
        .mockResolvedValueOnce(nextRound);

      await service.closeCycle('t1', 'r1', 'u1');

      expect(currentRound.status).toBe(RoundStatus.CLOSED);
      expect(nextRound.status).toBe(RoundStatus.COLLECTING);
      expect(manager.save).toHaveBeenCalledWith(Round, currentRound);
      expect(manager.save).toHaveBeenCalledWith(Round, nextRound);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('closes round and sets tontine to COMPLETED if next round does not exist', async () => {
      const currentRound = {
        id: 'r1',
        index: 1,
        status: RoundStatus.PAID,
      } as Round;
      const tontine = { id: 't1', status: TontineStatus.ACTIVE } as Tontine;

      manager.findOne
        .mockResolvedValueOnce(tontine)
        .mockResolvedValueOnce(currentRound)
        .mockResolvedValueOnce(null); // No next round

      await service.closeCycle('t1', 'r1', 'u1');

      expect(currentRound.status).toBe(RoundStatus.CLOSED);
      expect(tontine.status).toBe(TontineStatus.COMPLETED);
      expect(manager.save).toHaveBeenCalledWith(Round, currentRound);
      expect(manager.save).toHaveBeenCalledWith(Tontine, tontine);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
