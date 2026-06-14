import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LedgerTransaction } from './ledger-transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { Fund } from '../tontine/fund.entity';
import {
  TransactionType,
  TransactionStatus,
  EntryType,
} from '../../common/enums';

export interface RecordTransactionDto {
  idempotencyKey: string;
  tontineId: string;
  roundId?: string;
  membershipId?: string;
  type: TransactionType;
  amount: number;
  reference?: string;
  description?: string;
  fundId: string;
  entryType: EntryType;
}

@Injectable()
export class LedgerService {
  constructor(private dataSource: DataSource) {}

  async recordTransaction(
    dto: RecordTransactionDto,
  ): Promise<LedgerTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingTx = await queryRunner.manager.findOne(LedgerTransaction, {
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existingTx) {
        throw new ConflictException(
          'Transaction already processed (Idempotency Key collision)',
        );
      }

      const fund = await queryRunner.manager.findOne(Fund, {
        where: { id: dto.fundId },
      });

      if (!fund) {
        throw new InternalServerErrorException('Fund not found');
      }

      const transaction = queryRunner.manager.create(LedgerTransaction, {
        idempotencyKey: dto.idempotencyKey,
        tontineId: dto.tontineId,
        roundId: dto.roundId,
        membershipId: dto.membershipId,
        type: dto.type,
        amount: dto.amount,
        status: TransactionStatus.COMPLETED,
        reference: dto.reference,
        description: dto.description,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      const balanceChange =
        dto.entryType === EntryType.CREDIT ? dto.amount : -dto.amount;

      if (
        dto.entryType === EntryType.DEBIT &&
        Number(fund.cachedBalance) < Number(dto.amount)
      ) {
        throw new ConflictException(
          'Insufficient funds in the targeted Caisse',
        );
      }

      fund.cachedBalance = Number(fund.cachedBalance) + Number(balanceChange);
      await queryRunner.manager.save(fund);

      const fundEntry = queryRunner.manager.create(LedgerEntry, {
        transactionId: savedTransaction.id,
        fundId: fund.id,
        membershipId: dto.membershipId,
        type: dto.entryType,
        amount: dto.amount,
        balanceAfter: fund.cachedBalance,
      } as any);

      const counterpartType =
        dto.entryType === EntryType.CREDIT ? EntryType.DEBIT : EntryType.CREDIT;
      const counterpartEntry = queryRunner.manager.create(LedgerEntry, {
        transactionId: savedTransaction.id,
        fundId: null, // External clearing
        membershipId: dto.membershipId,
        type: counterpartType,
        amount: dto.amount,
        balanceAfter: null,
      } as any);

      await queryRunner.manager.save([fundEntry, counterpartEntry]);

      await queryRunner.commitTransaction();
      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
