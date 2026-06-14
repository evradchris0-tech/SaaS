import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivateTontineDto } from './dto/activate-tontine.dto';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { TontinesService } from './tontines.service';

@Controller('tontines')
export class TontinesController {
  constructor(private readonly tontinesService: TontinesService) {}

  @Post()
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
