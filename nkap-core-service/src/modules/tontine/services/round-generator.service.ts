import { Injectable } from '@nestjs/common';
import { Tontine } from '../tontine.entity';
import { Membership } from '../membership.entity';
import { Round } from '../round.entity';
import { TontineStrategyFactory } from '../strategies/tontine-strategy.factory';

@Injectable()
export class RoundGeneratorService {
  constructor(private strategyFactory: TontineStrategyFactory) {}

  generateSchedule(
    tontine: Tontine,
    members: Membership[],
    startDate: Date,
  ): Round[] {
    const strategy = this.strategyFactory.getStrategy(tontine.type);

    const rounds = strategy.generateRounds({
      tontine,
      members,
      startDate,
    });

    // Attache l'ID de la tontine aux rounds générés
    rounds.forEach((round) => {
      round.tontineId = tontine.id;
    });

    return rounds;
  }
}
