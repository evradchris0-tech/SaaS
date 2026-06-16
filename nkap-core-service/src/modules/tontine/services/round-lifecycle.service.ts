import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
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
  TontineType,
  BidStatus,
} from '../../../common/enums';
import { TontinesService } from '../tontines.service';
import { Membership } from '../membership.entity';
import { Fund } from '../fund.entity';
import { Bid } from '../bid.entity';
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
        // C'était le dernier round : distribution des dividendes si AUCTION.
        if (tontine.type === TontineType.AUCTION) {
          await this.distributeDividends(queryRunner, tontineId, round.id);
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

  /**
   * Répartit, en fin de tontine, le solde de la caisse DIVIDEND à parts égales
   * entre les membres actifs. Le reliquat de la division entière (solde mod
   * nbMembres) est distribué une unité à la fois aux premiers membres (ordre
   * déterministe par id) : la caisse DIVIDEND est ainsi vidée à EXACTEMENT 0,
   * sans valeur orpheline. Idempotent (clé par membre + round).
   */
  private async distributeDividends(
    queryRunner: QueryRunner,
    tontineId: string,
    roundId: string,
  ): Promise<void> {
    const dividendFund = await queryRunner.manager.findOne(Fund, {
      where: { tontineId, type: FundType.DIVIDEND },
      lock: { mode: 'pessimistic_write' },
    });
    const totalDividend = dividendFund ? Number(dividendFund.cachedBalance) : 0;
    if (!dividendFund || totalDividend <= 0) {
      return;
    }

    const members = await queryRunner.manager.find(Membership, {
      where: { tontineId, status: 'ACTIVE' },
    });
    if (members.length === 0) {
      return;
    }

    const base = Math.floor(totalDividend / members.length);
    let remainder = totalDividend - base * members.length;

    // Ordre déterministe pour l'attribution reproductible du reliquat.
    const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
    for (const member of ordered) {
      const amount = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) {
        remainder -= 1;
      }
      if (amount <= 0) {
        continue;
      }
      await this.ledgerService.recordTransaction(
        {
          tontineId,
          roundId,
          membershipId: member.id,
          type: TransactionType.PAYOUT,
          amount,
          reference: 'Dividendes fin de cycle',
          description: 'Distribution des dividendes des enchères',
          fundId: dividendFund.id,
          entryType: EntryType.DEBIT,
          idempotencyKey: `DIVIDEND-PAYOUT-${member.id}-${roundId}`,
        },
        queryRunner,
      );
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

      // Postgres interdit `SELECT ... FOR UPDATE` sur le côté nullable d'un
      // OUTER JOIN : on verrouille le round SANS jointure, puis on charge les
      // enchères séparément (cf. relations: ['bids'] retiré).
      const round = await queryRunner.manager.findOne(Round, {
        where: { id: roundId, tontineId },
        lock: { mode: 'pessimistic_write' },
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

      if (tontine.type === TontineType.AUCTION) {
        const strategy = new AuctionStrategy();

        // Chargement des enchères hors verrou (cf. note ci-dessus).
        round.bids = await queryRunner.manager.find(Bid, {
          where: { roundId: round.id },
        });

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
              bid.status =
                bid.membershipId === winner.membershipId
                  ? BidStatus.WINNING
                  : BidStatus.REJECTED;
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
