import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionType } from '../../common/enums';
import { Fund } from '../tontine/fund.entity';
import { Membership } from '../tontine/membership.entity';
import { LedgerTransaction } from '../ledger/ledger-transaction.entity';
import { LedgerQueryDto } from './dto/ledger-query.dto';

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Lectures financières d'une tontine (soldes des caisses, historique du Ledger,
 * cotisations). Toutes scopées aux membres de la tontine (isolation).
 */
@Injectable()
export class FinanceService {
  constructor(private readonly dataSource: DataSource) {}

  private async assertTontineMember(
    tontineId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.dataSource
      .getRepository(Membership)
      .findOne({ where: { tontineId, userId } });
    if (!membership) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette tontine");
    }
  }

  /** Soldes des 4 caisses de la tontine. */
  async getFunds(tontineId: string, userId: string): Promise<Fund[]> {
    await this.assertTontineMember(tontineId, userId);
    return this.dataSource
      .getRepository(Fund)
      .find({ where: { tontineId }, order: { type: 'ASC' } });
  }

  /** Historique des transactions du Ledger (paginé, plus récent d'abord). */
  async getLedger(
    tontineId: string,
    userId: string,
    query: LedgerQueryDto,
  ): Promise<Paginated<LedgerTransaction>> {
    await this.assertTontineMember(tontineId, userId);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const [items, total] = await this.dataSource
      .getRepository(LedgerTransaction)
      .findAndCount({
        where: query.type ? { tontineId, type: query.type } : { tontineId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });
    return { items, total, limit, offset };
  }

  /** Cotisations enregistrées (transactions de type CONTRIBUTION). */
  async getContributions(
    tontineId: string,
    userId: string,
  ): Promise<LedgerTransaction[]> {
    await this.assertTontineMember(tontineId, userId);
    return this.dataSource.getRepository(LedgerTransaction).find({
      where: { tontineId, type: TransactionType.CONTRIBUTION },
      order: { createdAt: 'DESC' },
    });
  }
}
