import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums';

export class AddMemberDto {
  @ApiProperty({ description: "ID de l'utilisateur à ajouter", format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.MEMBER,
    description: 'Rôle du membre dans la tontine',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Nombre de parts détenues par le membre',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  shares?: number;
}
