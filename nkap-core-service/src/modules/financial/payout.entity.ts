import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { PayoutStatus } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity('payouts')
export class Payout extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  membershipId: string;

  @Column({ type: 'uuid' })
  @Index()
  roundId: string;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  grossAmount: number;

  @Column({ type: 'bigint', default: 0, transformer: new BigIntTransformer() })
  deductions: number;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  netDisbursed: number;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;
}
