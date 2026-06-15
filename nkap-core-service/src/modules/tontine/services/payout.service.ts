import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LedgerService } from '../../ledger/ledger.service';
import { Round } from '../round.entity';
import { Fund } from '../fund.entity';
import { Tontine } from '../tontine.entity';
import {
  RoundStatus,
  TransactionType,
  FundType,
  EntryType,
  TontineStatus,
} from '../../../common/enums';
import { LedgerTransaction } from '../../ledger/ledger-transaction.entity';
import { Bid } from '../bid.entity';

@Injectable()
export class PayoutService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  async executePayout(params: {
    tontineId: string;
    roundId: string;
    idempotencyKey?: string;
  }): Promise<LedgerTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tontine = await queryRunner.manager.findOne(Tontine, {
        where: { id: params.tontineId },
      });
      if (!tontine || tontine.status !== TontineStatus.ACTIVE) {
        throw new BadRequestException('Tontine introuvable ou inactive.');
      }

      const round = await queryRunner.manager.findOne(Round, {
        where: { id: params.roundId, tontineId: params.tontineId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!round) {
        throw new BadRequestException(
          'Round non trouvé ou inactif pour cette tontine.',
        );
      }

      if (
        round.status === RoundStatus.PAID ||
        round.status === RoundStatus.CLOSED
      ) {
        throw new BadRequestException('Ce cycle a déjà été payé ou clôturé.');
      }

      if (!round.beneficiaryMembershipId) {
        throw new BadRequestException('Aucun bénéficiaire assigné à ce cycle.');
      }

      const fund = await queryRunner.manager.findOne(Fund, {
        where: { tontineId: params.tontineId, type: FundType.MAIN },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fund) {
        throw new BadRequestException(
          'Caisse principale (MAIN) introuvable pour cette tontine.',
        );
      }

      let amountToPayout = Number(round.expectedAmount);
      let discountAmount = 0;

      if (tontine.type === 'AUCTION') {
        const winningBid = await queryRunner.manager.findOne(Bid, {
          where: { roundId: round.id, status: 'WINNING' as any },
        });

        if (winningBid) {
          discountAmount = Number(winningBid.discountAmount);
          amountToPayout = amountToPayout - discountAmount;

          const dividendFund = await queryRunner.manager.findOne(Fund, {
            where: { tontineId: params.tontineId, type: FundType.DIVIDEND },
            lock: { mode: 'pessimistic_write' },
          });

          if (!dividendFund) {
            throw new BadRequestException('Caisse DIVIDEND introuvable.');
          }

          // Accrual de l'escompte
          await this.ledgerService.recordTransaction(
            {
              tontineId: params.tontineId,
              roundId: round.id,
              membershipId: round.beneficiaryMembershipId,
              type: TransactionType.FEE, // Ou un type spécifique, FEE est OK pour l'escompte
              amount: discountAmount,
              reference: `Escompte enchère du cycle ${round.index}`,
              description: `Accrual du discount pour la caisse dividendes`,
              fundId: fund.id,
              entryType: EntryType.DEBIT, // Sortie du main
              idempotencyKey: `DISCOUNT-DEBIT-${round.id}-${Date.now()}`,
            },
            queryRunner,
          );

          await this.ledgerService.recordTransaction(
            {
              tontineId: params.tontineId,
              roundId: round.id,
              membershipId: round.beneficiaryMembershipId,
              type: TransactionType.FEE,
              amount: discountAmount,
              reference: `Escompte enchère du cycle ${round.index}`,
              description: `Accrual du discount reçu`,
              fundId: dividendFund.id,
              entryType: EntryType.CREDIT, // Entrée dans dividend
              idempotencyKey: `DISCOUNT-CREDIT-${round.id}-${Date.now()}`,
            },
            queryRunner,
          );
        }
      }

      if (
        Number(fund.cachedBalance) <
        Number(amountToPayout) + discountAmount
      ) {
        throw new BadRequestException(
          'Fonds insuffisants dans la Caisse MAIN pour effectuer le décaissement.',
        );
      }

      const idempotencyKey =
        params.idempotencyKey || `PAYOUT-${round.id}-${Date.now()}`;

      const transaction = await this.ledgerService.recordTransaction(
        {
          tontineId: params.tontineId,
          roundId: round.id,
          membershipId: round.beneficiaryMembershipId,
          type: TransactionType.PAYOUT,
          amount: amountToPayout,
          reference: `Décaissement du cycle ${round.index}`,
          description: `Paiement de la cagnotte au bénéficiaire`,
          fundId: fund.id,
          entryType: EntryType.DEBIT,
          idempotencyKey,
        },
        queryRunner,
      );

      round.status = RoundStatus.PAID;
      await queryRunner.manager.save(Round, round);

      await queryRunner.commitTransaction();
      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
