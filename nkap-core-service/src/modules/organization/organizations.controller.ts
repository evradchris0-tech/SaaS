import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrgMemberRoleDto } from './dto/update-org-member-role.dto';
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
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthUser) {
    return this.organizationsService.create(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les organisations dont je suis membre' })
  @ApiResponse({ status: 200, description: 'Liste des organisations' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  list(@CurrentUser() user: AuthUser) {
    return this.organizationsService.listForUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une organisation (réservé aux membres)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Organisation' })
  @ApiResponse({
    status: 403,
    description: "Vous n'appartenez pas à cette organisation",
  })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizationsService.getById(id, user.userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: "Lister les membres d'une organisation (membres)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Liste des membres' })
  @ApiResponse({
    status: 403,
    description: "Vous n'appartenez pas à cette organisation",
  })
  listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizationsService.listMembers(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une organisation (OWNER/ADMIN)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Organisation mise à jour' })
  @ApiResponse({ status: 403, description: 'Réservé aux OWNER/ADMIN' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizationsService.update(id, dto, user.userId);
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

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: "Changer le rôle d'un membre (OWNER)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour' })
  @ApiResponse({ status: 403, description: 'Réservé aux OWNER' })
  @ApiResponse({ status: 404, description: 'Membre introuvable' })
  @ApiResponse({ status: 409, description: 'Dernier OWNER non rétrogradable' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateOrgMemberRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizationsService.updateMemberRole(
      id,
      userId,
      dto,
      user.userId,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Retirer un membre de l'organisation (OWNER/ADMIN)",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Membre retiré' })
  @ApiResponse({ status: 403, description: 'Réservé aux OWNER/ADMIN' })
  @ApiResponse({ status: 404, description: 'Membre introuvable' })
  @ApiResponse({ status: 409, description: 'Dernier OWNER non supprimable' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizationsService.removeMember(id, userId, user.userId);
  }
}
