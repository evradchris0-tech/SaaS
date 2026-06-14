import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrgRole } from '../../common/enums';
import { AddOrgMemberDto } from './dto/add-org-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationMembership } from './organization-membership.entity';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(private readonly dataSource: DataSource) {}

  /** Crée une organisation et fait du créateur son OWNER, en une transaction. */
  async create(
    dto: CreateOrganizationDto,
    creatorUserId: string,
  ): Promise<Organization> {
    return this.dataSource.transaction(async (manager) => {
      const org = await manager.save(
        manager.create(Organization, { name: dto.name }),
      );
      await manager.save(
        manager.create(OrganizationMembership, {
          organizationId: org.id,
          userId: creatorUserId,
          role: OrgRole.OWNER,
        }),
      );
      return org;
    });
  }

  /** Rattache un utilisateur à l'organisation. Réservé aux OWNER/ADMIN. */
  async addMember(
    organizationId: string,
    dto: AddOrgMemberDto,
    requestingUserId: string,
  ): Promise<OrganizationMembership> {
    const org = await this.dataSource
      .getRepository(Organization)
      .findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('Organisation introuvable');
    }

    await this.assertOrgRole(organizationId, requestingUserId, [
      OrgRole.OWNER,
      OrgRole.ADMIN,
    ]);

    const repo = this.dataSource.getRepository(OrganizationMembership);
    const existing = await repo.findOne({
      where: { organizationId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        'Cet utilisateur est déjà membre de l’organisation',
      );
    }

    return repo.save(
      repo.create({
        organizationId,
        userId: dto.userId,
        role: dto.role ?? OrgRole.MEMBER,
      }),
    );
  }

  /**
   * Vérifie que l'utilisateur appartient à l'organisation (avec l'un des rôles
   * requis, le cas échéant). Lève ForbiddenException sinon.
   */
  async assertOrgRole(
    organizationId: string,
    userId: string,
    roles?: OrgRole[],
  ): Promise<void> {
    const membership = await this.dataSource
      .getRepository(OrganizationMembership)
      .findOne({ where: { organizationId, userId } });
    if (!membership) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }
    if (roles && roles.length > 0 && !roles.includes(membership.role)) {
      throw new ForbiddenException('Rôle insuffisant sur cette organisation');
    }
  }
}
