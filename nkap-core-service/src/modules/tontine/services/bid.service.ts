import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bid } from '../bid.entity';
import { Round } from '../round.entity';
import { Membership } from '../membership.entity';
import { Tontine } from '../tontine.entity';
import {
  RoundStatus,
  TontineStatus,
  TontineType,
  BidStatus,
} from '../../../common/enums';

export interface PlaceBidDto {
  tontineId: string;
  roundId: string;
  membershipId: string;
  discountAmount: number;
}

@Injectable()
export class BidService {
  constructor(
    @InjectRepository(Bid) private bidRepository: Repository<Bid>,
    @InjectRepository(Round) private roundRepository: Repository<Round>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Tontine) private tontineRepository: Repository<Tontine>,
  ) {}

  async placeBid(dto: PlaceBidDto): Promise<Bid> {
    const tontine = await this.tontineRepository.findOne({
      where: { id: dto.tontineId },
    });
    if (!tontine) {
      throw new NotFoundException('Tontine not found');
    }
    if (tontine.status !== TontineStatus.ACTIVE) {
      throw new BadRequestException('Tontine must be ACTIVE to place a bid');
    }
    if (tontine.type !== TontineType.AUCTION) {
      throw new BadRequestException(
        'Bids are only allowed in AUCTION tontines',
      );
    }

    const round = await this.roundRepository.findOne({
      where: { id: dto.roundId, tontineId: dto.tontineId },
    });
    if (!round) {
      throw new NotFoundException('Round not found');
    }
    if (round.status !== RoundStatus.COLLECTING) {
      throw new BadRequestException('Round is not open for bidding');
    }

    const expectedAmount = Number(round.expectedAmount);
    if (dto.discountAmount <= 0 || dto.discountAmount >= expectedAmount) {
      throw new BadRequestException(
        `Discount amount must be greater than 0 and less than ${expectedAmount}`,
      );
    }

    const membership = await this.membershipRepository.findOne({
      where: { id: dto.membershipId, tontineId: dto.tontineId },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Check if the member has already won a previous round
    const pastWinningRound = await this.roundRepository.findOne({
      where: {
        tontineId: dto.tontineId,
        beneficiaryMembershipId: dto.membershipId,
      },
    });
    if (pastWinningRound) {
      throw new BadRequestException(
        'Member has already won a round and cannot bid again',
      );
    }

    // Upsert the bid
    let bid = await this.bidRepository.findOne({
      where: { roundId: dto.roundId, membershipId: dto.membershipId },
    });

    if (bid) {
      bid.discountAmount = dto.discountAmount;
    } else {
      bid = this.bidRepository.create({
        roundId: dto.roundId,
        membershipId: dto.membershipId,
        discountAmount: dto.discountAmount,
        status: BidStatus.PENDING,
      });
    }

    return this.bidRepository.save(bid);
  }

  async getBids(
    tontineId: string,
    roundId: string,
    requestingMembershipId: string,
  ): Promise<Bid[]> {
    const round = await this.roundRepository.findOne({
      where: { id: roundId, tontineId },
      relations: ['bids'],
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    if (!round.bids) {
      return [];
    }

    // Mode scellé : Si le round est encore en collecte, on ne renvoie que la mise du demandeur.
    if (round.status === RoundStatus.COLLECTING) {
      return round.bids.filter(
        (b) => b.membershipId === requestingMembershipId,
      );
    }

    // Sinon (READY, PAID, CLOSED), toutes les mises sont publiques
    return round.bids;
  }
}
