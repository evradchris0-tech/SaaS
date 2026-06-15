import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fund } from './fund.entity';
import { Membership } from './membership.entity';
import { Round } from './round.entity';
import { Tontine } from './tontine.entity';
import { TontinesController } from './tontines.controller';
import { TontinesService } from './tontines.service';
import { RoundGeneratorService } from './services/round-generator.service';
import { TontineStrategyFactory } from './strategies/tontine-strategy.factory';
import { ContributionService } from './services/contribution.service';
import { PayoutService } from './services/payout.service';
import { PenaltyService } from './services/penalty.service';
import { RoundLifecycleService } from './services/round-lifecycle.service';
import { PenaltyCronService } from './cron/penalty-cron.service';
import { LedgerModule } from '../ledger/ledger.module';
import { Contribution } from '../financial/contribution.entity';

import { Bid } from './bid.entity';
import { BidService } from './services/bid.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tontine,
      Fund,
      Membership,
      Round,
      Contribution,
      Bid,
    ]),
    LedgerModule,
  ],
  controllers: [TontinesController],
  providers: [
    TontinesService,
    RoundGeneratorService,
    TontineStrategyFactory,
    ContributionService,
    PayoutService,
    PenaltyService,
    RoundLifecycleService,
    PenaltyCronService,
    BidService,
  ],
})
export class TontinesModule {}
