import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerTransaction } from './ledger-transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { LedgerService } from './ledger.service';
import { Fund } from '../tontine/fund.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerTransaction, LedgerEntry, Fund])],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
