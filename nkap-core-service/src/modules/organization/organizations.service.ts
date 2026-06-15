import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { OrgRole } from '../../common/enums';
import { AddOrgMemberDto } from './dto/add-org-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrgMemberRoleDto } from './dto/update-org-member-role.dto';
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

  /** Liste les organisations dont l'utilisateur est membre (scoping multi-tenant). */
  async listForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.dataSource
      .getRepository(OrganizationMembership)
      .find({ where: { userId } });
    if (memberships.length === 0) {
      return [];
    }
    const orgIds = memberships.map((m) => m.organizationId);
    return this.dataSource
      .getRepository(Organization)
      .find({ where: { id: In(orgIds) } });
  }

  /** Détail d'une organisation (réservé à ses membres). */
  async getById(organizationId: string, userId: string): Promise<Organization> {
    await this.assertOrgRole(organizationId, userId);
    const org = await this.dataSource
      .getRepository(Organization)
      .findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('Organisation introuvable');
    }
    return org;
  }

  /** Liste les membres d'une organisation (réservé à ses membres). */
  async listMembers(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership[]> {
    await this.assertOrgRole(organizationId, userId);
    return this.dataSource
      .getRepository(OrganizationMembership)
      .find({ where: { organizationId } });
  }

  /** Met à jour une organisation (OWNER/ADMIN). */
  async update(
    organizationId: string,
    dto: UpdateOrganizationDto,
    requestingUserId: string,
  ): Promise<Organization> {
    await this.assertOrgRole(organizationId, requestingUserId, [
      OrgRole.OWNER,
      OrgRole.ADMIN,
    ]);
    const repo = this.dataSource.getRepository(Organization);
    const org = await repo.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('Organisation introuvable');
    }
    if (dto.name !== undefined) {
      org.name = dto.name;
    }
    return repo.save(org);
  }

  /** Change le rôle d'un membre (OWNER uniquement). */
  async updateMemberRole(
    organizationId: string,
    targetUserId: string,
    dto: UpdateOrgMemberRoleDto,
    requestingUserId: string,
  ): Promise<OrganizationMembership> {
    await this.assertOrgRole(organizationId, requestingUserId, [OrgRole.OWNER]);
    const repo = this.dataSource.getRepository(OrganizationMembership);
    const membership = await repo.findOne({
      where: { organizationId, userId: targetUserId },
    });
    if (!membership) {
      throw new NotFoundException('Membre introuvable dans cette organisation');
    }
    // On ne peut pas rétrograder le dernier OWNER.
    if (membership.role === OrgRole.OWNER && dto.role !== OrgRole.OWNER) {
      await this.assertNotLastOwner(organizationId);
    }
    membership.role = dto.role;
    return repo.save(membership);
  }

  /** Retire un membre de l'organisation (OWNER/ADMIN). */
  async removeMember(
    organizationId: string,
    targetUserId: string,
    requestingUserId: string,
  ): Promise<void> {
    await this.assertOrgRole(organizationId, requestingUserId, [
      OrgRole.OWNER,
      OrgRole.ADMIN,
    ]);
    const repo = this.dataSource.getRepository(OrganizationMembership);
    const membership = await repo.findOne({
      where: { organizationId, userId: targetUserId },
    });
    if (!membership) {
      throw new NotFoundException('Membre introuvable dans cette organisation');
    }
    if (membership.role === OrgRole.OWNER) {
      await this.assertNotLastOwner(organizationId);
    }
    await repo.softRemove(membership);
  }

  /** Garde-fou : interdit de retirer/rétrograder le dernier OWNER. */
  private async assertNotLastOwner(organizationId: string): Promise<void> {
    const owners = await this.dataSource
      .getRepository(OrganizationMembership)
      .count({ where: { organizationId, role: OrgRole.OWNER } });
    if (owners <= 1) {
      throw new ConflictException(
        'Impossible de retirer ou rétrograder le dernier OWNER',
      );
    }
  }
}
