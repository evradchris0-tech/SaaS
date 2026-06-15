import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Round } from '../round.entity';
import { Tontine } from '../tontine.entity';
import { RoundStatus, TontineStatus, Role } from '../../../common/enums';
import { TontinesService } from '../tontines.service';

@Injectable()
export class RoundLifecycleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tontinesService: TontinesService,
  ) {}

  async closeCycle(
    tontineId: string,
    roundId: string,
    requestingUserId: string,
  ): Promise<void> {
    await this.tontinesService.assertMembershipRole(
      tontineId,
      requestingUserId,
      [Role.PRESIDENT],
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tontine = await queryRunner.manager.findOne(Tontine, {
        where: { id: tontineId },
      });

      if (!tontine || tontine.status !== TontineStatus.ACTIVE) {
        throw new BadRequestException(
          'La tontine doit être ACTIVE pour clôturer un cycle.',
        );
      }

      const round = await queryRunner.manager.findOne(Round, {
        where: { id: roundId, tontineId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!round) {
        throw new NotFoundException('Cycle introuvable.');
      }

      if (round.status !== RoundStatus.PAID) {
        throw new BadRequestException(
          'Impossible de clôturer un cycle qui n’est pas à l’état PAID.',
        );
      }

      // 1. Fermer le round actuel
      round.status = RoundStatus.CLOSED;
      await queryRunner.manager.save(Round, round);

      // 2. Trouver et ouvrir le prochain round
      const nextRound = await queryRunner.manager.findOne(Round, {
        where: { tontineId, index: round.index + 1 },
      });

      if (nextRound) {
        nextRound.status = RoundStatus.COLLECTING;
        await queryRunner.manager.save(Round, nextRound);
      } else {
        // C'était le dernier round
        tontine.status = TontineStatus.COMPLETED;
        await queryRunner.manager.save(Tontine, tontine);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
