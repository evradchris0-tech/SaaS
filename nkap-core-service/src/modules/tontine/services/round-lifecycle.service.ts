import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Round } from '../round.entity';
import { Tontine } from '../tontine.entity';
import { LedgerService } from '../../ledger/ledger.service';
import {
  RoundStatus,
  TontineStatus,
  Role,
  FundType,
  TransactionType,
  EntryType,
} from '../../../common/enums';
import { TontinesService } from '../tontines.service';
import { Membership } from '../membership.entity';
import { Fund } from '../fund.entity';
import { AuctionStrategy } from '../strategies/auction.strategy';

@Injectable()
export class RoundLifecycleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tontinesService: TontinesService,
    private readonly ledgerService: LedgerService,
  ) {}

  async closeCycle(
    tontineId: string,
    roundId: string,
    requestingUserId: string,
  ): Promise<void> {
    await this.tontinesService.assertMembershipRole(
      tontineId,
      requestingUserId,
      [Role.PRESIDENT],
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tontine = await queryRunner.manager.findOne(Tontine, {
        where: { id: tontineId },
      });

      if (!tontine || tontine.status !== TontineStatus.ACTIVE) {
        throw new BadRequestException(
          'La tontine doit être ACTIVE pour clôturer un cycle.',
        );
      }

      const round = await queryRunner.manager.findOne(Round, {
        where: { id: roundId, tontineId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!round) {
        throw new NotFoundException('Cycle introuvable.');
      }

      if (round.status !== RoundStatus.PAID) {
        throw new BadRequestException(
          'Impossible de clôturer un cycle qui n’est pas à l’état PAID.',
        );
      }

      // 1. Fermer le round actuel
      round.status = RoundStatus.CLOSED;
      await queryRunner.manager.save(Round, round);

      // 2. Trouver et ouvrir le prochain round
      const nextRound = await queryRunner.manager.findOne(Round, {
        where: { tontineId, index: round.index + 1 },
      });

      if (nextRound) {
        nextRound.status = RoundStatus.COLLECTING;
        await queryRunner.manager.save(Round, nextRound);
      } else {
        // C'était le dernier round, distribution des dividendes si AUCTION
        if (tontine.type === 'AUCTION') {
          const dividendFund = await queryRunner.manager.findOne(Fund, {
            where: { tontineId, type: FundType.DIVIDEND },
            lock: { mode: 'pessimistic_write' },
          });

          if (dividendFund && Number(dividendFund.cachedBalance) > 0) {
            const members = await queryRunner.manager.find(Membership, {
              where: { tontineId, status: 'ACTIVE' },
            });

            if (members.length > 0) {
              const dividendPerMember = Math.floor(
                Number(dividendFund.cachedBalance) / members.length,
              );

              if (dividendPerMember > 0) {
                // Pour chaque membre, on enregistre un DEBIT sur DIVIDEND (PAYOUT)
                for (const member of members) {
                  await this.ledgerService.recordTransaction(
                    {
                      tontineId,
                      roundId: round.id,
                      membershipId: member.id,
                      type: TransactionType.PAYOUT,
                      amount: dividendPerMember,
                      reference: 'Dividendes fin de cycle',
                      description: 'Distribution des dividendes des enchères',
                      fundId: dividendFund.id,
                      entryType: EntryType.DEBIT,
                      idempotencyKey: `DIVIDEND-PAYOUT-${member.id}-${round.id}`,
                    },
                    queryRunner,
                  );
                }
              }
            }
          }
        }
        tontine.status = TontineStatus.COMPLETED;
        await queryRunner.manager.save(Tontine, tontine);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async resolveRound(
    tontineId: string,
    roundId: string,
    requestingUserId: string,
  ): Promise<void> {
    await this.tontinesService.assertMembershipRole(
      tontineId,
      requestingUserId,
      [Role.PRESIDENT],
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tontine = await queryRunner.manager.findOne(Tontine, {
        where: { id: tontineId },
      });

      if (!tontine || tontine.status !== TontineStatus.ACTIVE) {
        throw new BadRequestException(
          'La tontine doit être ACTIVE pour résoudre un cycle.',
        );
      }

      const round = await queryRunner.manager.findOne(Round, {
        where: { id: roundId, tontineId },
        lock: { mode: 'pessimistic_write' },
        relations: ['bids'],
      });

      if (!round) {
        throw new NotFoundException('Cycle introuvable.');
      }

      if (
        round.status !== RoundStatus.COLLECTING &&
        round.status !== RoundStatus.OVERDUE
      ) {
        throw new BadRequestException(
          'Le cycle doit être en collecte pour être résolu.',
        );
      }

      if (tontine.type === 'AUCTION') {
        const strategy = new AuctionStrategy();

        const members = await queryRunner.manager.find(Membership, {
          where: { tontineId },
        });

        const pastRounds = await queryRunner.manager.find(Round, {
          where: { tontineId },
        });

        const winner = await strategy.determineBeneficiary(
          round,
          members,
          pastRounds,
        );
        if (winner) {
          round.beneficiaryMembershipId = winner.membershipId;

          if (round.bids && round.bids.length > 0) {
            for (const bid of round.bids) {
              if (bid.membershipId === winner.membershipId) {
                bid.status = 'WINNING' as any;
              } else {
                bid.status = 'REJECTED' as any;
              }
              await queryRunner.manager.save(bid);
            }
          }
        }
      }

      // Si c'est pas une enchère, le bénéficiaire est déjà connu (fixé lors de la génération).
      if (!round.beneficiaryMembershipId) {
        throw new BadRequestException(
          "Aucun bénéficiaire n'a pu être déterminé pour ce round.",
        );
      }

      round.status = RoundStatus.READY;
      await queryRunner.manager.save(Round, round);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
