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
import { AddOrgMemberDto } from './dto/add-org-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une organisation (le créateur en devient OWNER)',
  })
  @ApiResponse({ status: 201, description: 'Organisation créée avec succès' })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé (Token JWT manquant ou invalide)',
  })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthUser) {
    return this.organizationsService.create(dto, user.userId);
  }

  /** Rattache un utilisateur à l'organisation (réservé OWNER/ADMIN). */
  @Post(':id/members')
  @ApiOperation({
    summary: "Rattacher un utilisateur à l'organisation (OWNER/ADMIN)",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Utilisateur rattaché' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({
    status: 403,
    description: "Réservé aux OWNER/ADMIN de l'organisation",
  })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @ApiResponse({ status: 409, description: 'Utilisateur déjà membre' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddOrgMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizationsService.addMember(id, dto, user.userId);
  }
}
