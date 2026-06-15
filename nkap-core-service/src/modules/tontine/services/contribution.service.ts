import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from '../round.entity';
import { Membership } from '../membership.entity';
import { Tontine } from '../tontine.entity';
import { Contribution } from '../../financial/contribution.entity';
import { LedgerService } from '../../ledger/ledger.service';
import { Fund } from '../fund.entity';
import { LedgerTransaction } from '../../ledger/ledger-transaction.entity';
import {
  TransactionType,
  EntryType,
  FundType,
  RoundStatus,
  TontineStatus,
} from '../../../common/enums';
import { v4 as uuidv4 } from 'uuid';

export interface PayContributionDto {
  tontineId: string;
  roundId: string;
  membershipId: string;
  amount: number;
  reference?: string;
  idempotencyKey?: string;
}

@Injectable()
export class ContributionService {
  constructor(
    @InjectRepository(Round) private roundRepository: Repository<Round>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Tontine) private tontineRepository: Repository<Tontine>,
    @InjectRepository(Contribution)
    private contributionRepository: Repository<Contribution>,
    @InjectRepository(Fund) private fundRepository: Repository<Fund>,
    private ledgerService: LedgerService,
  ) {}

  async payContribution(dto: PayContributionDto) {
    const round = await this.roundRepository.findOne({
      where: { id: dto.roundId, tontineId: dto.tontineId },
    });
    if (!round) {
      throw new NotFoundException('Round not found');
    }

    if (
      round.status !== RoundStatus.COLLECTING &&
      round.status !== RoundStatus.OVERDUE &&
      round.status !== RoundStatus.SCHEDULED
    ) {
      throw new BadRequestException('Round is not open for contributions');
    }

    const membership = await this.membershipRepository.findOne({
      where: { id: dto.membershipId, tontineId: dto.tontineId },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const tontine = await this.tontineRepository.findOne({
      where: { id: dto.tontineId },
    });
    if (!tontine) {
      throw new NotFoundException('Tontine not found');
    }
    if (tontine.status !== TontineStatus.ACTIVE) {
      throw new BadRequestException(
        'Tontine must be ACTIVE to accept contributions',
      );
    }

    const result = await this.ledgerService['dataSource']
      .getRepository(LedgerTransaction)
      .createQueryBuilder('tx')
      .select('SUM(tx.amount)', 'totalPaid')
      .where('tx.tontineId = :tontineId', { tontineId: dto.tontineId })
      .andWhere('tx.roundId = :roundId', { roundId: dto.roundId })
      .andWhere('tx.membershipId = :membershipId', {
        membershipId: dto.membershipId,
      })
      .andWhere('tx.type = :type', { type: TransactionType.CONTRIBUTION })
      .getRawOne();

    const totalPaid = Number(result?.totalPaid || 0);
    const expectedForMember =
      tontine.ruleSet.contribution.amountPerShare * membership.shares;
    const dueAmount = expectedForMember - totalPaid;

    if (dueAmount <= 0) {
      throw new BadRequestException(
        'Contribution for this round is already fully paid',
      );
    }
    if (Number(dto.amount) !== dueAmount) {
      throw new BadRequestException(
        `Amount must be exactly the remaining due amount: ${dueAmount}`,
      );
    }

    const mainFund = await this.fundRepository.findOne({
      where: { tontineId: dto.tontineId, type: FundType.MAIN },
    });
    if (!mainFund) {
      throw new NotFoundException('Main Fund not found for this tontine');
    }

    const idempotencyKey = dto.idempotencyKey || uuidv4();

    const transaction = await this.ledgerService.recordTransaction({
      idempotencyKey,
      tontineId: dto.tontineId,
      roundId: dto.roundId,
      membershipId: dto.membershipId,
      type: TransactionType.CONTRIBUTION,
      amount: dto.amount,
      reference: dto.reference,
      description: `Contribution for round ${round.index}`,
      fundId: mainFund.id,
      entryType: EntryType.CREDIT,
    });

    return transaction;
  }
}
