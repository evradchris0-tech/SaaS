import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
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
    return this.sign(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { phone: dto.phone } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.sign(user);
  }

  private sign(user: User) {
    const payload = { sub: user.id, phone: user.phone };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, phone: user.phone, fullName: user.fullName },
    };
  }
}
