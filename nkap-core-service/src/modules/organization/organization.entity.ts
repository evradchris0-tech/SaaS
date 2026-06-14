import { Entity, Column } from 'typeorm';
import { SoftDeletableEntity } from '../../common/base.entity';

@Entity('organizations')
export class Organization extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
}
