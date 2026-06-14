import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: "Nom de l'organisation",
    example: 'Association des anciens',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
