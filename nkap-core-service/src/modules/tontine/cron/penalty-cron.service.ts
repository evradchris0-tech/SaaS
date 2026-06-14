import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PenaltyService } from '../services/penalty.service';

@Injectable()
export class PenaltyCronService {
  private readonly logger = new Logger(PenaltyCronService.name);

  constructor(private readonly penaltyService: PenaltyService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log(
      'Cron triggered: Checking for overdue rounds to apply penalties.',
    );
    try {
      await this.penaltyService.processOverdueRounds();
    } catch (error) {
      this.logger.error(
        'Error during penalty processing job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
