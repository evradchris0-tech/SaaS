import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protège une route : exige un Bearer JWT valide. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
