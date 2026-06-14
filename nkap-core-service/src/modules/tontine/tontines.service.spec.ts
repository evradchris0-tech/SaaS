import { TontinesService } from './tontines.service';
import { Tontine } from './tontine.entity';
import { Fund } from './fund.entity';
import { TontineType, TontineStatus } from '../../common/enums';
import { CreateTontineDto } from './dto/create-tontine.dto';

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

    const service = new TontinesService(dataSource);
    const dto: CreateTontineDto = {
      organizationId: '11111111-1111-1111-1111-111111111111',
      name: 'Njangi des amis',
      type: TontineType.ROTATING,
      currency: 'XAF',
      ruleSet: {} as never,
    };

    await service.create(dto);

    // 1 tontine, en statut DRAFT
    const tontineCalls = created.filter((c) => c.entity === Tontine);
    expect(tontineCalls).toHaveLength(1);
    expect(tontineCalls[0].value.status).toBe(TontineStatus.DRAFT);

    // exactement 4 caisses
    const fundCalls = created.filter((c) => c.entity === Fund);
    expect(fundCalls).toHaveLength(4);
    expect(fundCalls.map((c) => c.value.type).sort()).toEqual(
      ['MAIN', 'PENALTY', 'PLATFORM', 'SOCIAL'].sort(),
    );
  });
});
