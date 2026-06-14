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

@Module({
  imports: [TypeOrmModule.forFeature([Tontine, Fund, Membership, Round])],
  controllers: [TontinesController],
  providers: [TontinesService, RoundGeneratorService, TontineStrategyFactory],
})
export class TontinesModule {}
