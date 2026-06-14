import {
  TontineStrategy,
  RoundGenerationParams,
} from './tontine-strategy.interface';
import { Round } from '../round.entity';
import { RoundStatus } from '../../../common/enums';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { RuleSet } from '../interfaces/rule-set.interface';

export class RotatingStrategy implements TontineStrategy {
  generateRounds(params: RoundGenerationParams): Round[] {
    const { tontine, members, startDate } = params;
    const ruleSet = tontine.ruleSet;
    const rounds: Round[] = [];

    // Pour une tontine rotative, un tour de rôle complet = autant de rounds que de parts/membres
    const totalRounds = members.length;
    let currentDate = new Date(startDate);

    for (let i = 0; i < totalRounds; i++) {
      const round = new Round();
      round.index = i + 1;
      round.expectedAmount =
        ruleSet.contribution.amountPerShare * members.length;
      round.dueDate = new Date(currentDate);
      round.status = RoundStatus.SCHEDULED;

      // Assigner un bénéficiaire fixe selon l'ordre des membres (Basic Rotating)
      if (ruleSet.beneficiary.order === 'FIXED') {
        round.beneficiaryMembershipId = members[i].id;
      }

      rounds.push(round);

      const freq = ruleSet.contribution.frequency;
      if (freq.unit === 'DAY') {
        currentDate = addDays(currentDate, freq.interval);
      } else if (freq.unit === 'WEEK') {
        currentDate = addWeeks(currentDate, freq.interval);
      } else if (freq.unit === 'MONTH') {
        currentDate = addMonths(currentDate, freq.interval);
      }
    }

    return rounds;
  }

  calculatePenalty(
    expectedAmount: number,
    daysLate: number,
    ruleSet: RuleSet,
  ): number {
    const penaltyRule = ruleSet.penalty;
    if (!penaltyRule || daysLate <= penaltyRule.graceDays) {
      return 0;
    }

    if (penaltyRule.type === 'FIXED') {
      return penaltyRule.value;
    } else if (penaltyRule.type === 'PERCENT') {
      return (expectedAmount * penaltyRule.value) / 100;
    }
    return 0;
  }
}
