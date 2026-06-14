import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrgRole } from '../../../common/enums';

export class AddOrgMemberDto {
  @ApiProperty({
    format: 'uuid',
    description: "ID de l'utilisateur à rattacher",
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    enum: OrgRole,
    default: OrgRole.MEMBER,
    description: "Rôle de l'utilisateur dans l'organisation",
  })
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;
}
