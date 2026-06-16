import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  FundType,
  Role,
  TontineStatus,
  RoundStatus,
  TontineType,
} from '../../common/enums';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { Fund } from './fund.entity';
import { Membership } from './membership.entity';
import { Round } from './round.entity';
import { Tontine } from './tontine.entity';
import { OrganizationMembership } from '../organization/organization-membership.entity';
import { RoundGeneratorService } from './services/round-generator.service';

/** Les 4 caisses créées automatiquement à la naissance d'une tontine. */
const DEFAULT_FUNDS: ReadonlyArray<{ type: FundType; name: string }> = [
  { type: FundType.MAIN, name: 'Caisse principale' },
  { type: FundType.SOCIAL, name: 'Caisse sociale' },
  { type: FundType.PENALTY, name: 'Caisse des pénalités' },
  { type: FundType.PLATFORM, name: 'Caisse plateforme' },
];

@Injectable()
export class TontinesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly roundGenerator: RoundGeneratorService,
  ) {}

  /**
   * Crée une tontine DRAFT + ses 4 caisses + le créateur comme Président,
   * en une transaction atomique.
   */
  async create(dto: CreateTontineDto, creatorUserId: string): Promise<Tontine> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // Multi-tenant : le créateur doit appartenir à l'organisation cible.
      const orgMembership = await manager.findOne(OrganizationMembership, {
        where: { organizationId: dto.organizationId, userId: creatorUserId },
      });
      if (!orgMembership) {
        throw new ForbiddenException(
          "Vous n'appartenez pas à cette organisation",
        );
      }

      const tontine = manager.create(Tontine, {
        organizationId: dto.organizationId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency,
        ruleSet: dto.ruleSet,
        status: TontineStatus.DRAFT,
      });
      const saved = await manager.save(tontine);

      // Les caisses par défaut + une caisse DIVIDEND dédiée aux tontines à
      // enchères (y transitent les escomptes, redistribués en fin de cycle).
      const fundDefs = [...DEFAULT_FUNDS];
      if (dto.type === TontineType.AUCTION) {
        fundDefs.push({
          type: FundType.DIVIDEND,
          name: 'Caisse des dividendes',
        });
      }
      const funds = fundDefs.map((f) =>
        manager.create(Fund, {
          tontineId: saved.id,
          name: f.name,
          type: f.type,
          cachedBalance: 0,
        }),
      );
      await manager.save(funds);

      // Le créateur devient automatiquement Président et premier membre actif.
      const president = manager.create(Membership, {
        tontineId: saved.id,
        userId: creatorUserId,
        role: Role.PRESIDENT,
        status: 'ACTIVE',
        shares: 1,
      });
      await manager.save(president);

      return saved;
    });
  }

  /**
   * Ajoute un membre à une tontine encore en DRAFT. On fige la composition
   * avant activation : pour les tontines rotatives, le calendrier est généré
   * à partir de la liste des membres — l'ajout post-activation l'invaliderait.
   */
  async addMember(
    tontineId: string,
    dto: AddMemberDto,
    requestingUserId: string,
  ): Promise<Membership> {
    const tontine = await this.dataSource
      .getRepository(Tontine)
      .findOne({ where: { id: tontineId } });
    if (!tontine) {
      throw new NotFoundException('Tontine introuvable');
    }
    // Seul le Président de la tontine peut composer la liste des membres.
    await this.assertMembershipRole(tontineId, requestingUserId, [
      Role.PRESIDENT,
    ]);
    if (tontine.status !== TontineStatus.DRAFT) {
      throw new ConflictException(
        'Des membres ne peuvent être ajoutés qu’à une tontine en DRAFT',
      );
    }

    const membershipRepo = this.dataSource.getRepository(Membership);
    const existing = await membershipRepo.findOne({
      where: { tontineId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        'Cet utilisateur est déjà membre de la tontine',
      );
    }

    const membership = membershipRepo.create({
      tontineId,
      userId: dto.userId,
      role: dto.role ?? Role.MEMBER,
      status: 'ACTIVE',
    });
    return membershipRepo.save(membership);
  }

  /**
   * Vérifie que l'utilisateur est membre de la tontine (et possède l'un des
   * rôles requis, le cas échéant). Lève ForbiddenException sinon.
   */
  async assertMembershipRole(
    tontineId: string,
    userId: string,
    roles?: Role[],
  ): Promise<Membership> {
    const membership = await this.dataSource
      .getRepository(Membership)
      .findOne({ where: { tontineId, userId } });
    if (!membership) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette tontine");
    }
    if (roles && roles.length > 0 && !roles.includes(membership.role)) {
      throw new ForbiddenException(
        'Rôle insuffisant pour effectuer cette opération',
      );
    }
    return membership;
  }

  /**
   * Active une tontine DRAFT : génère le calendrier des Rounds via la Strategy
   * (moteur de Gemini) et passe le statut à ACTIVE — le tout en transaction.
   * Réservé au Président de la tontine.
   */
  async activate(
    id: string,
    startDate: Date,
    requestingUserId: string,
  ): Promise<Tontine> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const tontine = await manager.findOne(Tontine, { where: { id } });
      if (!tontine) {
        throw new NotFoundException('Tontine introuvable');
      }
      if (tontine.status !== TontineStatus.DRAFT) {
        throw new ConflictException(
          'Seule une tontine en DRAFT peut être activée',
        );
      }

      const members = await manager.find(Membership, {
        where: { tontineId: id },
        order: { createdAt: 'ASC' },
      });
      if (members.length === 0) {
        throw new BadRequestException(
          'Impossible d’activer une tontine sans membre',
        );
      }

      const isPresident = members.some(
        (m) => m.userId === requestingUserId && m.role === Role.PRESIDENT,
      );
      if (!isPresident) {
        throw new ForbiddenException(
          'Seul le président de la tontine peut l’activer',
        );
      }

      const rounds = this.roundGenerator.generateSchedule(
        tontine,
        members,
        startDate,
      );
      if (rounds.length > 0) {
        rounds[0].status = RoundStatus.COLLECTING;
      }
      await manager.save(Round, rounds);

      tontine.status = TontineStatus.ACTIVE;
      return manager.save(tontine);
    });
  }

  // --- NEW METHODS FOR FULL API COVERAGE ---

  async findAllForUser(userId: string, limit = 10, offset = 0) {
    // Liste paginée des tontines auxquelles l'utilisateur appartient
    const memberships = await this.dataSource.getRepository(Membership).find({
      where: { userId },
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    if (memberships.length === 0) return [];

    const tontineIds = memberships.map((m) => m.tontineId);
    return this.dataSource.getRepository(Tontine).find({
      where: { id: In(tontineIds) },
    });
  }

  async findOneScoped(tontineId: string, userId: string) {
    await this.assertMembershipRole(tontineId, userId); // Vérifie appartenance
    const tontine = await this.dataSource.getRepository(Tontine).findOne({
      where: { id: tontineId },
    });
    if (!tontine) throw new NotFoundException('Tontine introuvable');
    return tontine;
  }

  async findMembers(tontineId: string, userId: string) {
    await this.assertMembershipRole(tontineId, userId);
    return this.dataSource.getRepository(Membership).find({
      where: { tontineId },
      order: { createdAt: 'ASC' },
    });
  }

  async findRounds(tontineId: string, userId: string) {
    await this.assertMembershipRole(tontineId, userId);
    return this.dataSource.getRepository(Round).find({
      where: { tontineId },
      order: { index: 'ASC' },
    });
  }

  async findRoundById(tontineId: string, roundId: string, userId: string) {
    await this.assertMembershipRole(tontineId, userId);
    const round = await this.dataSource.getRepository(Round).findOne({
      where: { id: roundId, tontineId },
    });
    if (!round) throw new NotFoundException('Tour introuvable');
    return round;
  }

  async updateRules(
    tontineId: string,
    userId: string,

    ruleSet: any,
  ) {
    await this.assertMembershipRole(tontineId, userId, [Role.PRESIDENT]);
    const tontine = await this.findOneScoped(tontineId, userId);
    if (tontine.status !== TontineStatus.DRAFT) {
      throw new ConflictException(
        "Impossible de modifier les règles : la tontine n'est plus en DRAFT",
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tontine.ruleSet = ruleSet;
    return this.dataSource.getRepository(Tontine).save(tontine);
  }

  async removeMember(tontineId: string, membershipId: string, userId: string) {
    await this.assertMembershipRole(tontineId, userId, [Role.PRESIDENT]);
    const tontine = await this.findOneScoped(tontineId, userId);
    if (tontine.status !== TontineStatus.DRAFT) {
      throw new ConflictException(
        "Impossible d'exclure un membre : la tontine n'est plus en DRAFT",
      );
    }
    const membershipRepo = this.dataSource.getRepository(Membership);
    const target = await membershipRepo.findOne({
      where: { id: membershipId, tontineId },
    });
    if (!target) throw new NotFoundException('Membre introuvable');
    if (target.userId === userId) {
      throw new ConflictException(
        "Le président ne peut pas s'exclure lui-même",
      );
    }
    await membershipRepo.softRemove(target);
  }

  async cancelTontine(tontineId: string, userId: string) {
    await this.assertMembershipRole(tontineId, userId, [Role.PRESIDENT]);
    const tontine = await this.findOneScoped(tontineId, userId);
    if (tontine.status !== TontineStatus.DRAFT) {
      // Pour annuler une ACTIVE, il faudrait des règles métiers complexes de remboursement.
      throw new ConflictException("Impossible d'annuler une tontine active");
    }
    tontine.status = TontineStatus.CANCELLED;
    await this.dataSource.getRepository(Tontine).save(tontine);
  }
}
