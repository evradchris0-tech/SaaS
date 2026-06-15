import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

/**
 * Jeton de rafraîchissement (révocable). On stocke uniquement le **hash SHA-256**
 * du token opaque (jamais la valeur brute) → une fuite de la table n'expose
 * aucun token utilisable. `revokedAt` permet l'expulsion immédiate (logout /
 * compromission).
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revokedAt: Date | null;
}
