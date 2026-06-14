import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ActivateTontineDto } from './dto/activate-tontine.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { TontinesService } from './tontines.service';

@ApiTags('Tontines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tontines')
export class TontinesController {
  constructor(private readonly tontinesService: TontinesService) {}

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

  /** Ajoute un membre à une tontine encore en DRAFT. */
  @Post(':id/members')
  @ApiOperation({ summary: 'Ajouter un membre à une tontine (DRAFT)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Membre ajouté avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Tontine introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Tontine non DRAFT ou utilisateur déjà membre',
  })
  addMember(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddMemberDto) {
    return this.tontinesService.addMember(id, dto);
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
}
