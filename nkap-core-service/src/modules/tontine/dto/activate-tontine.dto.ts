import { IsDateString, IsOptional } from 'class-validator';

export class ActivateTontineDto {
  /** Date de démarrage du cycle (ISO 8601). Par défaut : maintenant. */
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
