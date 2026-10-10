import { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Reflector } from '@nestjs/core';
import { PublicGuard } from './public.guard.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

function contextWith(isPublic: boolean | undefined): {
  context: ExecutionContext;
  reflector: Reflector;
} {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === IS_PUBLIC_KEY ? isPublic : undefined,
  } as unknown as Reflector;

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('PublicGuard', () => {
  it('lets a route tagged @Public through', () => {
    const { context, reflector } = contextWith(true);
    const guard = new PublicGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lets an untagged route through so JwtGuard can deny it', () => {
    // PublicGuard must not short-circuit the chain with a 403: returning true
    // keeps NestJS running guards until JwtGuard, which rejects untagged
    // routes with the correct 401 for a missing token.
    const { context, reflector } = contextWith(undefined);
    const guard = new PublicGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });
});

describe('IS_PUBLIC_KEY', () => {
  it('matches the key the Public decorator writes', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
