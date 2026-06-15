import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Bid } from './bid.entity';
import { RoundStatus } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity('rounds')
export class Round extends BaseEntity {
  @Column({ type: 'uuid' })
  tontineId: string;

  @Column({ type: 'int' })
  index: number;

  @Column({ type: 'timestamp with time zone' })
  dueDate: Date;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  expectedAmount: number;

  @Column({ type: 'uuid', nullable: true })
  beneficiaryMembershipId: string | null;

  @Column({ type: 'enum', enum: RoundStatus, default: RoundStatus.SCHEDULED })
  status: RoundStatus;

  @OneToMany(() => Bid, (bid) => bid.round)
  bids: Bid[];
}
