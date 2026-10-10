import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Runs before JwtGuard. A route tagged @Public() is fully open, so the guard
 * returns true and JwtGuard still authenticates the caller if a token is
 * present (useful for endpoints that work both anonymously and signed-in).
 * An untagged route returns true here and is left to JwtGuard to reject, so
 * authentication is default-deny and any mistake fails closed.
 */
@Injectable()
export class PublicGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return Boolean(isPublic);
  }
}
