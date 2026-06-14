import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle organisation' })
  @ApiResponse({ status: 201, description: 'Organisation créée avec succès' })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé (Token JWT manquant ou invalide)',
  })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }
}
