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

export class CreateTontineDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TontineType)
  type: TontineType;

  /** Code devise ISO 4217 (XAF, XOF, EUR…). */
  @IsString()
  @Length(3, 3)
  currency: string;

  /** Règles de la tontine (validation fine déléguée au moteur BC2 — Sprint 2). */
  @IsObject()
  ruleSet: RuleSet;
}
