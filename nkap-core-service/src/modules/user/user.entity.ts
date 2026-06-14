import { Entity, Column } from 'typeorm';
import { SoftDeletableEntity } from '../../common/base.entity';

@Entity('users')
export class User extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;
}
