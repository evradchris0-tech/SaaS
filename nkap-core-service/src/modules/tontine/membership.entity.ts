import { Entity, Column } from 'typeorm';
import { SoftDeletableEntity } from '../../common/base.entity';
import { Role } from '../../common/enums';

@Entity('memberships')
export class Membership extends SoftDeletableEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  tontineId: string;

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role: Role;

  @Column({ type: 'varchar', length: 50, default: 'INVITED' })
  status: string;

  @Column({ type: 'int', default: 1 })
  shares: number;
}
