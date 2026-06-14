import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { TontineType } from '../../../common/enums';
import type { RuleSet } from '../interfaces/rule-set.interface';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTontineDto {
  @ApiProperty({ description: "ID de l'organisation", format: 'uuid' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'Nom de la tontine',
    example: 'Tontine Familiale',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: TontineType,
    description: 'Type de la tontine',
    example: TontineType.ROTATING,
  })
  @IsEnum(TontineType)
  type: TontineType;

  /** Code devise ISO 4217 (XAF, XOF, EUR…). */
  @ApiProperty({
    description: 'Devise de la tontine (ISO 4217)',
    example: 'XAF',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  currency: string;

  /** Règles de la tontine (validation fine déléguée au moteur BC2 — Sprint 2). */
  @ApiProperty({
    description: 'Règles mathématiques de la tontine',
  })
  @IsObject()
  ruleSet: RuleSet;
}
