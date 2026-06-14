import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { FundType, TontineStatus } from '../../common/enums';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { Fund } from './fund.entity';
import { Tontine } from './tontine.entity';

/** Les 4 caisses créées automatiquement à la naissance d'une tontine. */
const DEFAULT_FUNDS: ReadonlyArray<{ type: FundType; name: string }> = [
  { type: FundType.MAIN, name: 'Caisse principale' },
  { type: FundType.SOCIAL, name: 'Caisse sociale' },
  { type: FundType.PENALTY, name: 'Caisse des pénalités' },
  { type: FundType.PLATFORM, name: 'Caisse plateforme' },
];

@Injectable()
export class TontinesService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Crée une tontine en statut DRAFT et initialise ses 4 caisses,
   * le tout dans UNE seule transaction (atomique).
   */
  async create(dto: CreateTontineDto): Promise<Tontine> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const tontine = manager.create(Tontine, {
        organizationId: dto.organizationId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency,
        ruleSet: dto.ruleSet,
        status: TontineStatus.DRAFT,
      });
      const saved = await manager.save(tontine);

      const funds = DEFAULT_FUNDS.map((f) =>
        manager.create(Fund, {
          tontineId: saved.id,
          name: f.name,
          type: f.type,
        }),
      );
      await manager.save(funds);

      return saved;
    });
  }
}
