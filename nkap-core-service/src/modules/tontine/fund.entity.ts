import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { FundType } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity('funds')
export class Fund extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  tontineId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: FundType })
  type: FundType;

  // La projection recalculée. Jamais une vérité indépendante.
  @Column({ type: 'bigint', default: 0, transformer: new BigIntTransformer() })
  cachedBalance: number;
}
