import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Numéro de téléphone', example: '+237600000000' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Mot de passe', example: 'StrongPass123!' })
  @IsString()
  password: string;
}
