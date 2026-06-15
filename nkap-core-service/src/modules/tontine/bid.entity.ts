import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { BidStatus } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';
import { Round } from './round.entity';
import { Membership } from './membership.entity';

@Entity('bids')
@Unique(['roundId', 'membershipId'])
export class Bid extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  roundId: string;

  @ManyToOne(() => Round, (round) => round.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundId' })
  round: Round;

  @Column({ type: 'uuid' })
  @Index()
  membershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membershipId' })
  membership: Membership;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  discountAmount: number;

  @Column({ type: 'enum', enum: BidStatus, default: BidStatus.PENDING })
  status: BidStatus;
}
