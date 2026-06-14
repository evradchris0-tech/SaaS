import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TontineType } from '../../../common/enums';
import { ApiProperty } from '@nestjs/swagger';
import { RuleSetDto } from './rule-set.dto';

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

  /** Règles mathématiques de la tontine — validées en profondeur (protège le moteur). */
  @ApiProperty({
    description: 'Règles mathématiques de la tontine',
    type: RuleSetDto,
  })
  @ValidateNested()
  @Type(() => RuleSetDto)
  ruleSet: RuleSetDto;
}
