import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateTontineRulesDto {
  @ApiProperty({
    description: 'Nouvelles règles de la tontine (ex: montant, fréquence)',
    example: { amount: 50000, frequency: 'MONTHLY' },
  })
  @IsNotEmpty()
  @IsObject()
  ruleSet: Record<string, any>;
}
