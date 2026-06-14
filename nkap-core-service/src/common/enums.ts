export enum FundType {
  MAIN = 'MAIN',
  SOCIAL = 'SOCIAL',
  PENALTY = 'PENALTY',
  PLATFORM = 'PLATFORM',
  SAVINGS = 'SAVINGS',
}

export enum TontineType {
  ROTATING = 'ROTATING',
  AUCTION = 'AUCTION',
  ACCUMULATING = 'ACCUMULATING',
  SOLIDARITY_FUND = 'SOLIDARITY_FUND',
}

export enum Role {
  PRESIDENT = 'PRESIDENT',
  TREASURER = 'TREASURER',
  SECRETARY = 'SECRETARY',
  CENSOR = 'CENSOR',
  MEMBER = 'MEMBER',
}

export enum RoundStatus {
  SCHEDULED = 'SCHEDULED',
  COLLECTING = 'COLLECTING',
  OVERDUE = 'OVERDUE',
  READY = 'READY',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
}

export enum TontineStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  CONTRIBUTION = 'CONTRIBUTION',
  PAYOUT = 'PAYOUT',
  PENALTY = 'PENALTY',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  SOLIDARITY_CLAIM = 'SOLIDARITY_CLAIM',
  FEE = 'FEE',
  REVERSAL = 'REVERSAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum ContributionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum ObligationType {
  LOAN = 'LOAN',
  PENALTY = 'PENALTY',
  FEE = 'FEE',
}

export enum ObligationStatus {
  ACTIVE = 'ACTIVE',
  PARTIALLY_SETTLED = 'PARTIALLY_SETTLED',
  SETTLED = 'SETTLED',
  DEFAULTED = 'DEFAULTED',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

/** Rôle d'un utilisateur au sein d'une organisation (multi-tenant). */
export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}
