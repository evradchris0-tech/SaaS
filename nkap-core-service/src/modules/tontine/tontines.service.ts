import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { FundType, TontineStatus } from '../../common/enums';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { Fund } from './fund.entity';
import { Membership } from './membership.entity';
import { Round } from './round.entity';
import { Tontine } from './tontine.entity';
import { RoundGeneratorService } from './services/round-generator.service';

/** Les 4 caisses créées automatiquement à la naissance d'une tontine. */
const DEFAULT_FUNDS: ReadonlyArray<{ type: FundType; name: string }> = [
  { type: FundType.MAIN, name: 'Caisse principale' },
  { type: FundType.SOCIAL, name: 'Caisse sociale' },
  { type: FundType.PENALTY, name: 'Caisse des pénalités' },
  { type: FundType.PLATFORM, name: 'Caisse plateforme' },
];

@Injectable()
export class TontinesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly roundGenerator: RoundGeneratorService,
  ) {}

  /** Crée une tontine DRAFT + ses 4 caisses, en une transaction atomique. */
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
          cachedBalance: 0,
        }),
      );
      await manager.save(funds);

      return saved;
    });
  }

  /**
   * Active une tontine DRAFT : génère le calendrier des Rounds via la Strategy
   * (moteur de Gemini) et passe le statut à ACTIVE — le tout en transaction.
   */
  async activate(id: string, startDate: Date): Promise<Tontine> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const tontine = await manager.findOne(Tontine, { where: { id } });
      if (!tontine) {
        throw new NotFoundException('Tontine introuvable');
      }
      if (tontine.status !== TontineStatus.DRAFT) {
        throw new ConflictException(
          'Seule une tontine en DRAFT peut être activée',
        );
      }

      const members = await manager.find(Membership, {
        where: { tontineId: id },
      });
      if (members.length === 0) {
        throw new BadRequestException(
          'Impossible d’activer une tontine sans membre',
        );
      }

      const rounds = this.roundGenerator.generateSchedule(
        tontine,
        members,
        startDate,
      );
      await manager.save(Round, rounds);

      tontine.status = TontineStatus.ACTIVE;
      return manager.save(tontine);
    });
  }
}
