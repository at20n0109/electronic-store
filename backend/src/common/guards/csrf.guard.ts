import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Protects cookie-authenticated state changes from cross-site requests. */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const cookies = (request.cookies ?? {}) as Record<string, string>;
    if (!cookies.access_token && !cookies.refresh_token) return true;

    const cookie = cookies.csrf_token;
    const header = request.header('x-csrf-token');
    if (!cookie || !header || !sameValue(cookie, header)) {
      throw new ForbiddenException('CSRF validation failed');
    }
    return true;
  }
}

function sameValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
