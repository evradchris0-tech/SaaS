import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fund } from './fund.entity';
import { Tontine } from './tontine.entity';
import { TontinesController } from './tontines.controller';
import { TontinesService } from './tontines.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tontine, Fund])],
  controllers: [TontinesController],
  providers: [TontinesService],
})
export class TontinesModule {}
