import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { PenaltyService } from '../services/penalty.service';

@Injectable()
export class PenaltyCronService implements OnApplicationShutdown {
  private readonly logger = new Logger(PenaltyCronService.name);

  constructor(
    private readonly penaltyService: PenaltyService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationShutdown(signal?: string) {
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((job) => job.stop());
    this.logger.log('Cron jobs stopped gracefully on application shutdown.');
  }

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
