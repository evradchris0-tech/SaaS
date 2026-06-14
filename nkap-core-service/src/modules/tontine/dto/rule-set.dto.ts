import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
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
 */

export class FrequencyDto {
  @ApiProperty({
    example: 1,
    description: "Nombre d'unités entre deux échéances",
  })
  @IsInt()
  @Min(1)
  interval: number;

  @ApiProperty({ enum: ['DAY', 'WEEK', 'MONTH'], example: 'MONTH' })
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
  @IsInt()
  @Min(1)
  amountPerShare: number;

  @ApiProperty({ type: FrequencyDto })
  @ValidateNested()
  @Type(() => FrequencyDto)
  frequency: FrequencyDto;

  @ApiProperty({
    example: false,
    description: 'Autoriser le versement par anticipation',
  })
  @IsBoolean()
  allowAdvance: boolean;
}

export class BeneficiaryRuleDto {
  @ApiProperty({
    enum: ['FIXED', 'RANDOM_DRAW', 'AUCTION', 'NEED_BASED'],
    example: 'FIXED',
  })
  @IsIn(['FIXED', 'RANDOM_DRAW', 'AUCTION', 'NEED_BASED'])
  order: 'FIXED' | 'RANDOM_DRAW' | 'AUCTION' | 'NEED_BASED';

  @ApiProperty({ example: false, description: "Autoriser l'échange de tour" })
  @IsBoolean()
  allowSwap: boolean;
}

export class PenaltyRuleDto {
  @ApiProperty({ enum: ['PERCENT', 'FIXED'], example: 'FIXED' })
  @IsIn(['PERCENT', 'FIXED'])
  type: 'PERCENT' | 'FIXED';

  @ApiProperty({
    example: 500,
    description: 'Valeur (montant si FIXED, pourcentage si PERCENT)',
  })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: 3, description: 'Jours de grâce avant pénalité' })
  @IsInt()
  @Min(0)
  graceDays: number;
}

export class InterestRuleDto {
  @ApiProperty({ example: 5, description: "Taux d'intérêt en pourcentage" })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ enum: ['SIMPLE', 'COMPOUND'], example: 'SIMPLE' })
  @IsIn(['SIMPLE', 'COMPOUND'])
  method: 'SIMPLE' | 'COMPOUND';
}

export class SolidarityRuleDto {
  @ApiProperty({ example: 1000, description: 'Cotisation solidaire par tour' })
  @IsInt()
  @Min(0)
  contributionPerRound: number;

  @ApiProperty({ example: true, description: 'Cotisation obligatoire ?' })
  @IsBoolean()
  mandatory: boolean;
}

export class RuleSetDto {
  @ApiProperty({ type: ContributionRuleDto })
  @ValidateNested()
  @Type(() => ContributionRuleDto)
  contribution: ContributionRuleDto;

  @ApiProperty({ type: BeneficiaryRuleDto })
  @ValidateNested()
  @Type(() => BeneficiaryRuleDto)
  beneficiary: BeneficiaryRuleDto;

  @ApiProperty({ type: PenaltyRuleDto })
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
