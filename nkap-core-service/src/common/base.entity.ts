import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date;
}
