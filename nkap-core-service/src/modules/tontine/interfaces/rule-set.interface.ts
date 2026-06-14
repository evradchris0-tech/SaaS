export interface Frequency {
  interval: number;
  unit: 'DAY' | 'WEEK' | 'MONTH';
  anchorDate?: Date;
}

export interface ContributionRule {
  amountPerShare: number;
  frequency: Frequency;
  allowAdvance: boolean;
}

export interface BeneficiaryRule {
  order: 'FIXED' | 'RANDOM_DRAW' | 'AUCTION' | 'NEED_BASED';
  allowSwap: boolean;
}

export interface PenaltyRule {
  type: 'PERCENT' | 'FIXED';
  value: number;
  graceDays: number;
}

export interface InterestRule {
  rate: number;
  method: 'SIMPLE' | 'COMPOUND';
}

export interface SolidarityRule {
  contributionPerRound: number;
  mandatory: boolean;
}

export interface RuleSet {
  contribution: ContributionRule;
  beneficiary: BeneficiaryRule;
  penalty: PenaltyRule;
  interest?: InterestRule;
  solidarity?: SolidarityRule;
  defaultRule?: any; // Sera précisé
}
