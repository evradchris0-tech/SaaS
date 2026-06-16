import {
  TontineStrategy,
  RoundGenerationParams,
} from './tontine-strategy.interface';
import { Round } from '../round.entity';
import { Membership } from '../membership.entity';
import { RoundStatus } from '../../../common/enums';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { RuleSet } from '../interfaces/rule-set.interface';

export class AuctionStrategy implements TontineStrategy {
  generateRounds(params: RoundGenerationParams): Round[] {
    const { tontine, members, startDate } = params;
    const ruleSet = tontine.ruleSet;
    const rounds: Round[] = [];

    const totalRounds = members.length;
    let currentDate = new Date(startDate);

    for (let i = 0; i < totalRounds; i++) {
      const round = new Round();
      round.index = i + 1;
      // La cagnotte du tour = somme des cotisations de tous les membres (le pot),
      // identique à la stratégie ROTATING. C'est ce pot, diminué de l'escompte de
      // l'enchère gagnante, qui est décaissé au bénéficiaire.
      round.expectedAmount =
        ruleSet.contribution.amountPerShare * members.length;
      round.dueDate = new Date(currentDate);
      round.status = RoundStatus.SCHEDULED;

      // Dans une tontine à enchères, le bénéficiaire n'est PAS connu à l'avance.
      round.beneficiaryMembershipId = null;

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
      return Math.round((expectedAmount * penaltyRule.value) / 100);
    }
    return 0;
  }

  determineBeneficiary(
    round: Round,
    members: Membership[],
    pastRounds: Round[],
  ): Promise<{ membershipId: string; discountAmount: number } | null> {
    const previousWinners = new Set(
      pastRounds
        .map((r) => r.beneficiaryMembershipId)
        .filter((id) => id !== null),
    );

    const eligibleMembers = members.filter((m) => !previousWinners.has(m.id));

    if (eligibleMembers.length === 0) {
      return Promise.resolve(null);
    }

    if (round.bids && round.bids.length > 0) {
      // Filtrer les bids des membres éligibles
      const eligibleBids = round.bids.filter((b) =>
        eligibleMembers.some((m) => m.id === b.membershipId),
      );

      if (eligibleBids.length > 0) {
        // Trier par discountAmount DESC, puis par date createdAt ASC
        eligibleBids.sort((a, b) => {
          if (a.discountAmount !== b.discountAmount) {
            return Number(b.discountAmount) - Number(a.discountAmount);
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

        const winningBid = eligibleBids[0];
        return Promise.resolve({
          membershipId: winningBid.membershipId,
          discountAmount: Number(winningBid.discountAmount),
        });
      }
    }

    // Fallback: Random draw among eligible members
    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    return Promise.resolve({
      membershipId: eligibleMembers[randomIndex].id,
      discountAmount: 0,
    });
  }
}
