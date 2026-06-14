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
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivateTontineDto } from './dto/activate-tontine.dto';
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
    description: 'Tontine et ses 4 caisses créées avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données de création invalides' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  create(@Body() dto: CreateTontineDto) {
    return this.tontinesService.create(dto);
  }

  /** Active une tontine (DRAFT -> ACTIVE) et génère ses Rounds. */
  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateTontineDto,
  ) {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    return this.tontinesService.activate(id, startDate);
  }
}
