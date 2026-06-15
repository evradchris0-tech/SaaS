import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Validation stricte du `ruleSet` envoyé à la création d'une tontine.
 * Ces DTO reflètent l'interface `RuleSet` (cf. interfaces/rule-set.interface.ts)
 * et protègent le moteur de calcul (Strategy) d'une configuration malformée.
 * `@IsDefined()` impose la PRÉSENCE des champs requis (sinon un champ absent
 * passerait la validation et casserait le moteur).
 */

export class FrequencyDto {
  @ApiProperty({
    example: 1,
    description: "Nombre d'unités entre deux échéances",
  })
  @IsDefined()
  @IsInt()
  @Min(1)
  interval: number;

  @ApiProperty({ enum: ['DAY', 'WEEK', 'MONTH'], example: 'MONTH' })
  @IsDefined()
  @IsIn(['DAY', 'WEEK', 'MONTH'])
  unit: 'DAY' | 'WEEK' | 'MONTH';

  @ApiPropertyOptional({
    description: "Date d'ancrage du calendrier (ISO 8601)",
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  anchorDate?: Date;
}

export class ContributionRuleDto {
  @ApiProperty({
    example: 10000,
    description: 'Montant par part (entier, plus petite unité de la devise)',
  })
  @IsDefined()
  @IsInt()
  @Min(1)
  amountPerShare: number;

  @ApiProperty({ type: FrequencyDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => FrequencyDto)
  frequency: FrequencyDto;

  @ApiProperty({
    example: false,
    description: 'Autoriser le versement par anticipation',
  })
  @IsDefined()
  @IsBoolean()
  allowAdvance: boolean;
}

export class BeneficiaryRuleDto {
  @ApiProperty({
    enum: ['FIXED', 'RANDOM_DRAW', 'AUCTION', 'NEED_BASED'],
    example: 'FIXED',
  })
  @IsDefined()
  @IsIn(['FIXED', 'RANDOM_DRAW', 'AUCTION', 'NEED_BASED'])
  order: 'FIXED' | 'RANDOM_DRAW' | 'AUCTION' | 'NEED_BASED';

  @ApiProperty({ example: false, description: "Autoriser l'échange de tour" })
  @IsDefined()
  @IsBoolean()
  allowSwap: boolean;
}

export class PenaltyRuleDto {
  @ApiProperty({ enum: ['PERCENT', 'FIXED'], example: 'FIXED' })
  @IsDefined()
  @IsIn(['PERCENT', 'FIXED'])
  type: 'PERCENT' | 'FIXED';

  @ApiProperty({
    example: 500,
    description: 'Valeur (montant si FIXED, pourcentage si PERCENT)',
  })
  @IsDefined()
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: 3, description: 'Jours de grâce avant pénalité' })
  @IsDefined()
  @IsInt()
  @Min(0)
  graceDays: number;
}

export class InterestRuleDto {
  @ApiProperty({ example: 5, description: "Taux d'intérêt en pourcentage" })
  @IsDefined()
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ enum: ['SIMPLE', 'COMPOUND'], example: 'SIMPLE' })
  @IsDefined()
  @IsIn(['SIMPLE', 'COMPOUND'])
  method: 'SIMPLE' | 'COMPOUND';
}

export class SolidarityRuleDto {
  @ApiProperty({ example: 1000, description: 'Cotisation solidaire par tour' })
  @IsDefined()
  @IsInt()
  @Min(0)
  contributionPerRound: number;

  @ApiProperty({ example: true, description: 'Cotisation obligatoire ?' })
  @IsDefined()
  @IsBoolean()
  mandatory: boolean;
}

export class RuleSetDto {
  @ApiProperty({ type: ContributionRuleDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ContributionRuleDto)
  contribution: ContributionRuleDto;

  @ApiProperty({ type: BeneficiaryRuleDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => BeneficiaryRuleDto)
  beneficiary: BeneficiaryRuleDto;

  @ApiProperty({ type: PenaltyRuleDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PenaltyRuleDto)
  penalty: PenaltyRuleDto;

  @ApiPropertyOptional({ type: InterestRuleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InterestRuleDto)
  interest?: InterestRuleDto;

  @ApiPropertyOptional({ type: SolidarityRuleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SolidarityRuleDto)
  solidarity?: SolidarityRuleDto;
}
