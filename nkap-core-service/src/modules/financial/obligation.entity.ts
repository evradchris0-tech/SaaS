import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { ObligationType, ObligationStatus } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity('obligations')
export class Obligation extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  membershipId: string;

  @Column({ type: 'enum', enum: ObligationType })
  type: ObligationType;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  principalAmount: number;

  @Column({ type: 'bigint', default: 0, transformer: new BigIntTransformer() })
  interestAmount: number;

  @Column({ type: 'bigint', default: 0, transformer: new BigIntTransformer() })
  repaidAmount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ObligationStatus,
    default: ObligationStatus.ACTIVE,
  })
  status: ObligationStatus;
}
