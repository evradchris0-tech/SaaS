import { Test, TestingModule } from '@nestjs/testing';
import { RoundGeneratorService } from './round-generator.service';
import { TontineStrategyFactory } from '../strategies/tontine-strategy.factory';
import { Tontine } from '../tontine.entity';
import { Membership } from '../membership.entity';
import { TontineType } from '../../../common/enums';

describe('RoundGeneratorService', () => {
  let service: RoundGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoundGeneratorService, TontineStrategyFactory],
    }).compile();

    service = module.get<RoundGeneratorService>(RoundGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate rounds for ROTATING tontine based on MONTHLY frequency', () => {
    const tontine = new Tontine();
    tontine.id = 'tontine-123';
    tontine.type = TontineType.ROTATING;
    tontine.ruleSet = {
      contribution: {
        amountPerShare: 50000,
        frequency: { interval: 1, unit: 'MONTH' },
        allowAdvance: false,
      },
      beneficiary: { order: 'FIXED', allowSwap: false },
      penalty: { type: 'FIXED', value: 1000, graceDays: 2 },
    } as any;

    const members = [
      { id: 'm1' } as Membership,
      { id: 'm2' } as Membership,
      { id: 'm3' } as Membership,
    ];

    const startDate = new Date('2026-07-01T00:00:00.000Z');

    const rounds = service.generateSchedule(tontine, members, startDate);

    expect(rounds.length).toBe(3);

    // Round 1 — cagnotte globale = amountPerShare * nombre de membres (50000 * 3)
    expect(rounds[0].index).toBe(1);
    expect(rounds[0].expectedAmount).toBe(150000);
    expect(rounds[0].beneficiaryMembershipId).toBe('m1');
    expect(rounds[0].dueDate.toISOString()).toBe('2026-07-01T00:00:00.000Z');

    // Round 2 (1 month later)
    expect(rounds[1].index).toBe(2);
    expect(rounds[1].beneficiaryMembershipId).toBe('m2');
    expect(rounds[1].dueDate.toISOString()).toBe('2026-08-01T00:00:00.000Z');

    // Round 3 (2 months later)
    expect(rounds[2].index).toBe(3);
    expect(rounds[2].beneficiaryMembershipId).toBe('m3');
    expect(rounds[2].dueDate.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('should generate rounds for AUCTION tontine without beneficiary', () => {
    const tontine = new Tontine();
    tontine.id = 'tontine-auction';
    tontine.type = TontineType.AUCTION;
    tontine.ruleSet = {
      contribution: {
        amountPerShare: 100000,
        frequency: { interval: 2, unit: 'WEEK' }, // Every 2 weeks
        allowAdvance: false,
      },
      beneficiary: { order: 'AUCTION', allowSwap: false },
      penalty: { type: 'PERCENT', value: 5, graceDays: 1 },
    } as any;

    const members = [{ id: 'm1' } as Membership, { id: 'm2' } as Membership];

    const startDate = new Date('2026-07-01T00:00:00.000Z');

    const rounds = service.generateSchedule(tontine, members, startDate);

    expect(rounds.length).toBe(2);

    // Round 1
    expect(rounds[0].index).toBe(1);
    expect(rounds[0].beneficiaryMembershipId).toBeNull();
    expect(rounds[0].dueDate.toISOString()).toBe('2026-07-01T00:00:00.000Z');

    // Round 2
    expect(rounds[1].index).toBe(2);
    expect(rounds[1].beneficiaryMembershipId).toBeNull();
    expect(rounds[1].dueDate.toISOString()).toBe('2026-07-15T00:00:00.000Z'); // 14 days later
  });
});
