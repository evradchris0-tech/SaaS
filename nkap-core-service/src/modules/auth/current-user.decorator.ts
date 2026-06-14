import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Forme de l'utilisateur injectée par `JwtStrategy.validate()`. */
export interface AuthUser {
  userId: string;
  phone: string;
}

/**
 * Récupère l'utilisateur authentifié (issu du JWT) directement dans la
 * signature du handler : `create(@CurrentUser() user: AuthUser)`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
