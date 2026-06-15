import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Post,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Récupérer son profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil récupéré avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async getProfile(@CurrentUser() user: AuthUser) {
    const profile = await this.usersService.findOneById(user.userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeProfile } = profile;
    return safeProfile;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Mettre à jour son profil' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updatedUser = await this.usersService.updateProfile(user.userId, dto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeProfile } = updatedUser;
    return safeProfile;
  }

  @Post('me/password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Changer son mot de passe' })
  @ApiResponse({ status: 200, description: 'Mot de passe changé avec succès' })
  @ApiResponse({ status: 400, description: 'Ancien mot de passe incorrect' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.userId, dto);
    return { message: 'Mot de passe modifié avec succès' };
  }
}
