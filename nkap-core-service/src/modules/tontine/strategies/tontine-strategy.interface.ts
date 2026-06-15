import { Tontine } from '../tontine.entity';
import { Round } from '../round.entity';
import { Membership } from '../membership.entity';
import { RuleSet } from '../interfaces/rule-set.interface';

export interface RoundGenerationParams {
  tontine: Tontine;
  members: Membership[];
  startDate: Date;
}

export interface TontineStrategy {
  /**
   * Generates the collection of Rounds based on the ruleset and members
   */
  generateRounds(params: RoundGenerationParams): Round[];

  /**
   * Calculates the penalty for a specific delay
   */
  calculatePenalty(
    expectedAmount: number,
    daysLate: number,
    ruleSet: RuleSet,
  ): number;

  /**
   * Determines the beneficiary of a given round, and returns their membership ID,
   * along with any discount applied (for auctions)
   */
  determineBeneficiary?(
    round: Round,
    members: Membership[],
    pastRounds: Round[],
  ): Promise<{ membershipId: string; discountAmount: number } | null>;
}
