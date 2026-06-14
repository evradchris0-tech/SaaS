import { IsEnum, IsOptional, IsUUID } from 'class-validator';
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
}
