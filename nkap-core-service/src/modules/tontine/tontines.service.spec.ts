import { TontinesService } from './tontines.service';
import { Tontine } from './tontine.entity';
import { Fund } from './fund.entity';
import { Round } from './round.entity';
import { TontineType, TontineStatus } from '../../common/enums';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { RoundGeneratorService } from './services/round-generator.service';

const makeRoundGen = () =>
  ({
    generateSchedule: jest.fn(() => [{ index: 1 }, { index: 2 }]),
  }) as unknown as RoundGeneratorService;

describe('TontinesService', () => {
  it('crée une tontine DRAFT + ses 4 caisses dans une transaction', async () => {
    const created: Array<{ entity: unknown; value: any }> = [];
    const manager = {
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
    } as unknown as import('typeorm').DataSource;

    const service = new TontinesService(dataSource, makeRoundGen());
    const dto: CreateTontineDto = {
      organizationId: '11111111-1111-1111-1111-111111111111',
      name: 'Njangi des amis',
      type: TontineType.ROTATING,
      currency: 'XAF',
      ruleSet: {} as never,
    };

    await service.create(dto);

    const tontineCalls = created.filter((c) => c.entity === Tontine);
    expect(tontineCalls).toHaveLength(1);
    expect(tontineCalls[0].value.status).toBe(TontineStatus.DRAFT);

    const fundCalls = created.filter((c) => c.entity === Fund);
    expect(fundCalls).toHaveLength(4);
    expect(fundCalls.map((c) => c.value.type).sort()).toEqual(
      ['MAIN', 'PENALTY', 'PLATFORM', 'SOCIAL'].sort(),
    );
  });

  it('active une tontine DRAFT : génère les rounds et passe ACTIVE', async () => {
    const tontine: any = {
      id: 't1',
      type: TontineType.ROTATING,
      status: TontineStatus.DRAFT,
    };
    const manager = {
      findOne: jest.fn(async () => tontine),
      find: jest.fn(async () => [{ id: 'm1' }, { id: 'm2' }]),
      save: jest.fn(async (a: unknown, b?: unknown) => b ?? a),
    };
    const dataSource = {
      transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
        cb(manager),
      ),
    } as unknown as import('typeorm').DataSource;
    const roundGen = makeRoundGen();

    const service = new TontinesService(dataSource, roundGen);
    const result: any = await service.activate('t1', new Date());

    expect(roundGen.generateSchedule).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledWith(Round, expect.any(Array));
    expect(result.status).toBe(TontineStatus.ACTIVE);
  });
});
