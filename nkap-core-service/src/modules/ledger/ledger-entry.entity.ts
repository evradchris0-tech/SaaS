import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { EntryType } from '../../common/enums';
import { BigIntTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity('ledger_entries')
export class LedgerEntry extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  transactionId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  fundId: string;

  @Column({ type: 'uuid', nullable: true })
  membershipId: string; // Si l'écriture est liée à un membre spécifique

  @Column({ type: 'enum', enum: EntryType })
  type: EntryType;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  amount: number;

  @Column({
    type: 'bigint',
    transformer: new BigIntTransformer(),
    nullable: true,
  })
  balanceAfter: number;

  @Column({ type: 'uuid', nullable: true })
  reversedEntryId: string; // Pour l'immuabilité : si l'écriture est annulée
}
