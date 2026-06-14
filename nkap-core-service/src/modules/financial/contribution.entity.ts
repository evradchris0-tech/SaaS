import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { ContributionStatus } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity('contributions')
export class Contribution extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  membershipId: string;

  @Column({ type: 'uuid' })
  @Index()
  roundId: string;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  expectedAmount: number;

  @Column({ type: 'bigint', default: 0, transformer: new BigIntTransformer() })
  paidAmount: number;

  @Column({
    type: 'enum',
    enum: ContributionStatus,
    default: ContributionStatus.PENDING,
  })
  status: ContributionStatus;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  idempotencyKey: string;
}
