import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Runs before JwtGuard. A route tagged @Public() is fully open, so the guard
 * returns true and JwtGuard still authenticates the caller if a token is
 * present (useful for endpoints that work both anonymously and signed-in).
 * An untagged route must ALSO return true so NestJS keeps running the guard
 * chain until JwtGuard, which performs default-deny authentication itself and
 * rejects untagged routes with a 401. Returning false here would short-circuit
 * the chain with a 403 and never let JwtGuard run.
 */
@Injectable()
export class PublicGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
