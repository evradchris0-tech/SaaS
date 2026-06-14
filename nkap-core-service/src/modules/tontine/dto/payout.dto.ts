import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayoutDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID du cycle (Round) à décaisser',
  })
  @IsUUID()
  roundId: string;
}
