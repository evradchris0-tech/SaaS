import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

/**
 * Lectures financières (soldes, Ledger, cotisations). Utilise le DataSource
 * global (les entités sont enregistrées par convention dans AppModule), donc
 * pas besoin de forFeature ici.
 */
@Module({
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
