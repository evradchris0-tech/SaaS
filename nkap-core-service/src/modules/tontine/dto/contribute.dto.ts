import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContributeDto {
  @ApiProperty({ format: 'uuid', description: 'ID du cycle (Round) concerné' })
  @IsUUID()
  roundId: string;

  @ApiProperty({
    format: 'uuid',
    description: "ID de l'adhésion (Membership) qui cotise",
  })
  @IsUUID()
  membershipId: string;

  @ApiProperty({
    example: 10000,
    description: 'Montant versé (entier, plus petite unité de la devise)',
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    description: 'Référence externe (ex. ID transaction Mobile Money)',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
