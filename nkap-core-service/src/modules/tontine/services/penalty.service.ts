import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Round } from '../round.entity';
import { Membership } from '../membership.entity';
import { Tontine } from '../tontine.entity';
import { Fund } from '../fund.entity';
import { LedgerTransaction } from '../../ledger/ledger-transaction.entity';
import { LedgerService } from '../../ledger/ledger.service';
import {
  RoundStatus,
  TransactionType,
  FundType,
  EntryType,
  TransactionStatus,
} from '../../../common/enums';
import { addDays, isPast } from 'date-fns';

@Injectable()
export class PenaltyService {
  private readonly logger = new Logger(PenaltyService.name);

  constructor(
    @InjectRepository(Round) private roundRepository: Repository<Round>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Tontine) private tontineRepository: Repository<Tontine>,
    @InjectRepository(Fund) private fundRepository: Repository<Fund>,
    private ledgerService: LedgerService,
    private dataSource: DataSource,
  ) {}

  async processOverdueRounds() {
    this.logger.log('Starting penalty processing job...');

    const overdueRounds = await this.roundRepository.find({
      where: {
        status: RoundStatus.COLLECTING,
        dueDate: LessThan(new Date()),
      },
    });

    for (const round of overdueRounds) {
      await this.processRoundPenalties(round);
    }

    this.logger.log('Penalty processing job completed.');
  }

  private async processRoundPenalties(round: Round) {
    const tontine = await this.tontineRepository.findOne({
      where: { id: round.tontineId },
    });
    if (!tontine || !tontine.ruleSet || !tontine.ruleSet.penalty) return;

    const penaltyRules = tontine.ruleSet.penalty;
    const graceDays = penaltyRules.graceDays || 0;
    const penaltyAmount =
      penaltyRules.type === 'FIXED'
        ? penaltyRules.value
        : Math.round((Number(round.expectedAmount) * penaltyRules.value) / 100);

    const strictDueDate = addDays(new Date(round.dueDate), graceDays);
    if (!isPast(strictDueDate)) {
      return;
    }

    const memberships = await this.membershipRepository.find({
      where: { tontineId: round.tontineId },
    });

    let allPaid = true;

    for (const membership of memberships) {
      const result = (await this.dataSource
        .getRepository(LedgerTransaction)
        .createQueryBuilder('tx')
        .select('SUM(tx.amount)', 'totalPaid')
        .where('tx.tontineId = :tontineId', { tontineId: round.tontineId })
        .andWhere('tx.roundId = :roundId', { roundId: round.id })
        .andWhere('tx.membershipId = :membershipId', {
          membershipId: membership.id,
        })
        .andWhere('tx.type = :type', { type: TransactionType.CONTRIBUTION })
        .andWhere('tx.status = :status', {
          status: TransactionStatus.COMPLETED,
        })
        .getRawOne()) as { totalPaid: string | null };

      const totalPaid = Number(result?.totalPaid || 0);

      if (totalPaid < Number(round.expectedAmount)) {
        allPaid = false;
        await this.applyPenalty(round, membership, penaltyAmount);
      }
    }

    if (!allPaid) {
      round.status = RoundStatus.OVERDUE;
      await this.roundRepository.save(round);
      this.logger.warn(
        `Round ${round.index} of Tontine ${round.tontineId} marked as OVERDUE.`,
      );
    } else {
      round.status = RoundStatus.READY;
      await this.roundRepository.save(round);
    }
  }

  private async applyPenalty(
    round: Round,
    membership: Membership,
    penaltyAmount: number,
  ) {
    const idempotencyKey = `PENALTY-${round.id}-${membership.id}`;

    const existingPenalty = await this.dataSource
      .getRepository(LedgerTransaction)
      .findOne({
        where: { idempotencyKey },
      });

    if (existingPenalty) return;

    const penaltyFund = await this.fundRepository.findOne({
      where: { tontineId: round.tontineId, type: FundType.PENALTY },
    });

    if (!penaltyFund) {
      this.logger.error(`No PENALTY fund found for tontine ${round.tontineId}`);
      return;
    }

    await this.ledgerService.recordTransaction({
      tontineId: round.tontineId,
      roundId: round.id,
      membershipId: membership.id,
      type: TransactionType.PENALTY,
      amount: penaltyAmount,
      fundId: penaltyFund.id,
      entryType: EntryType.CREDIT,
      reference: `Pénalité de retard - Cycle ${round.index}`,
      description: `Pénalité automatique suite au non-paiement intégral.`,
      idempotencyKey,
    });

    this.logger.log(
      `Penalty of ${penaltyAmount} applied to membership ${membership.id} for round ${round.id}`,
    );
  }
}
