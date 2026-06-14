import { Entity, Column, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../common/base.entity';
import { TontineType, TontineStatus } from '../../common/enums';
import type { RuleSet } from './interfaces/rule-set.interface';

@Entity('tontines')
export class Tontine extends SoftDeletableEntity {
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: TontineType })
  type: TontineType;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'jsonb' })
  ruleSet: RuleSet;

  @Column({ type: 'enum', enum: TontineStatus, default: TontineStatus.DRAFT })
  status: TontineStatus;
}
