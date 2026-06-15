import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { User } from '../user/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Ce numéro est déjà enregistré');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.users.create({
      phone: dto.phone,
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
    });
    const saved = await this.users.save(user);
    return this.issueTokens(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { phone: dto.phone } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.issueTokens(user);
  }

  /** Échange un refresh token valide contre un nouveau couple (avec rotation). */
  async refresh(rawToken: string) {
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
    // Rotation : on révoque l'ancien jeton et on en émet un nouveau.
    stored.revokedAt = new Date();
    await this.refreshTokens.save(stored);

    const user = await this.users.findOne({ where: { id: stored.userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    return this.issueTokens(user);
  }

  /** Révoque un refresh token (déconnexion). Idempotent. */
  async logout(rawToken: string): Promise<void> {
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await this.refreshTokens.save(stored);
    }
  }

  /** Émet un accessToken (JWT court) + un refreshToken opaque (hash stocké). */
  private async issueTokens(user: User) {
    const accessToken = this.jwt.sign({ sub: user.id, phone: user.phone });

    const rawRefresh = randomBytes(32).toString('hex');
    const ttlSeconds = parseInt(
      this.config.get<string>('REFRESH_EXPIRES_IN_SECONDS', '2592000'),
      10,
    );
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: this.hashToken(rawRefresh),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        revokedAt: null,
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, phone: user.phone, fullName: user.fullName },
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
