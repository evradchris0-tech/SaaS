import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrgRole } from '../../../common/enums';

export class UpdateOrgMemberRoleDto {
  @ApiProperty({ enum: OrgRole, description: 'Nouveau rôle du membre' })
  @IsEnum(OrgRole)
  role: OrgRole;
}
