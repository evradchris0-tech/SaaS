import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { TransactionType, TransactionStatus } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity('ledger_transactions')
export class LedgerTransaction extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  tontineId: string;

  @Column({ type: 'uuid', nullable: true })
  roundId: string;

  @Column({ type: 'uuid', nullable: true })
  membershipId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;
}
