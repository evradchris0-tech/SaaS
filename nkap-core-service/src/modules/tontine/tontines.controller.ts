import { Body, Controller, Post } from '@nestjs/common';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { TontinesService } from './tontines.service';

@Controller('tontines')
export class TontinesController {
  constructor(private readonly tontinesService: TontinesService) {}

  @Post()
  create(@Body() dto: CreateTontineDto) {
    return this.tontinesService.create(dto);
  }
}
