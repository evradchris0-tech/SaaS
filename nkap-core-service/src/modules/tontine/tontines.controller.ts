import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ActivateTontineDto } from './dto/activate-tontine.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ContributeDto } from './dto/contribute.dto';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { PayoutDto } from './dto/payout.dto';
import { ContributionService } from './services/contribution.service';
import { PayoutService } from './services/payout.service';
import { TontinesService } from './tontines.service';

@ApiTags('Tontines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tontines')
export class TontinesController {
  constructor(
    private readonly tontinesService: TontinesService,
    private readonly contributionService: ContributionService,
    private readonly payoutService: PayoutService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une tontine en statut DRAFT avec ses caisses',
  })
  @ApiResponse({
    status: 201,
    description:
      'Tontine, ses 4 caisses et le Président (créateur) créés avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données de création invalides' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  create(@Body() dto: CreateTontineDto, @CurrentUser() user: AuthUser) {
    return this.tontinesService.create(dto, user.userId);
  }

  /** Ajoute un membre à une tontine en DRAFT. Réservé au Président. */
  @Post(':id/members')
  @ApiOperation({
    summary: 'Ajouter un membre à une tontine (Président, DRAFT)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Membre ajouté avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Seul le président de la tontine peut ajouter des membres',
  })
  @ApiResponse({ status: 404, description: 'Tontine introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Tontine non DRAFT ou utilisateur déjà membre',
  })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tontinesService.addMember(id, dto, user.userId);
  }

  /** Active une tontine (DRAFT -> ACTIVE) et génère ses Rounds. */
  @Post(':id/activate')
  @ApiOperation({
    summary: 'Activer une tontine (DRAFT → ACTIVE) et générer ses Rounds',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Tontine activée' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Seul le président de la tontine peut l’activer',
  })
  @ApiResponse({ status: 404, description: 'Tontine introuvable' })
  @ApiResponse({ status: 409, description: 'Tontine non DRAFT' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateTontineDto,
    @CurrentUser() user: AuthUser,
  ) {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    return this.tontinesService.activate(id, startDate, user.userId);
  }

  /** Enregistre une cotisation d'un membre pour un cycle (crédite la caisse MAIN). */
  @Post(':id/contribute')
  @ApiOperation({ summary: 'Enregistrer une cotisation pour un cycle' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Clé d’idempotence (évite les doublons de paiement)',
  })
  @ApiResponse({
    status: 201,
    description: 'Cotisation enregistrée (transaction Ledger créée)',
  })
  @ApiResponse({ status: 400, description: 'Cycle fermé ou données invalides' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Vous n’êtes pas membre de cette tontine',
  })
  @ApiResponse({
    status: 404,
    description: 'Cycle / adhésion / caisse introuvable',
  })
  @ApiResponse({ status: 409, description: 'Idempotency-Key déjà utilisée' })
  async contribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContributeDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    await this.tontinesService.assertMembershipRole(id, user.userId);
    return this.contributionService.payContribution({
      tontineId: id,
      roundId: dto.roundId,
      membershipId: dto.membershipId,
      amount: dto.amount,
      reference: dto.reference,
      idempotencyKey,
    });
  }

  /** Décaisse la cagnotte d'un cycle au bénéficiaire (débite la caisse MAIN). */
  @Post(':id/payout')
  @ApiOperation({
    summary:
      'Décaisser la cagnotte d’un cycle au bénéficiaire (Président/Trésorier)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Clé d’idempotence (évite les doubles décaissements)',
  })
  @ApiResponse({
    status: 201,
    description: 'Décaissement effectué (cycle -> PAID)',
  })
  @ApiResponse({
    status: 400,
    description: 'Cycle déjà payé, sans bénéficiaire, ou fonds insuffisants',
  })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: 'Réservé au Président ou au Trésorier de la tontine',
  })
  @ApiResponse({ status: 409, description: 'Idempotency-Key déjà utilisée' })
  async payout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayoutDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    await this.tontinesService.assertMembershipRole(id, user.userId, [
      Role.PRESIDENT,
      Role.TREASURER,
    ]);
    return this.payoutService.executePayout({
      tontineId: id,
      roundId: dto.roundId,
      idempotencyKey,
    });
  }
}
