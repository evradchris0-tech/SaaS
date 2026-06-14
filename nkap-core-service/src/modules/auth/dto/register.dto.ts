import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  /** Téléphone = identifiant principal (marché CM). Format E.164 souple. */
  @ApiProperty({
    description: 'Numéro de téléphone au format E.164',
    example: '+237600000000',
  })
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  phone: string;

  @ApiProperty({
    description: "Nom complet de l'utilisateur",
    example: 'John Doe',
  })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({
    description: 'Mot de passe sécurisé',
    example: 'StrongPass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  password: string;

  @ApiPropertyOptional({
    description: 'Adresse email optionnelle',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
