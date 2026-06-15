import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "Nom complet de l'utilisateur",
    example: 'Jean Dupont',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Adresse email (optionnelle)',
    example: 'jean.dupont@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
