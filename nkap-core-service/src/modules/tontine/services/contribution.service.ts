import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from '../round.entity';
import { Membership } from '../membership.entity';
import { LedgerService } from '../../ledger/ledger.service';
import { Fund } from '../fund.entity';
import {
  TransactionType,
  EntryType,
  FundType,
  RoundStatus,
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
