import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { TransactionType } from '../../common/enums';

@Entity('ledger_transactions')
export class LedgerTransaction extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  tontineId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;
}
