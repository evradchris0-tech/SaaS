import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'Le refresh token reçu à la connexion' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
