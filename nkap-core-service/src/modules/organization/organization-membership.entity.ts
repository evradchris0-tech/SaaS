import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../common/base.entity';
import { OrgRole } from '../../common/enums';

/** Lien d'appartenance User <-> Organization (isolation multi-tenant). */
@Entity('organization_memberships')
@Index(['organizationId', 'userId'], { unique: true })
export class OrganizationMembership extends SoftDeletableEntity {
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: OrgRole, default: OrgRole.MEMBER })
  role: OrgRole;
}
