import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { RateLimitGuard } from './rate-limit.guard.js';

function context(path: string, method = 'POST'): ExecutionContext {
  const request = {
    path,
    method,
    ip: '203.0.113.10',
    socket: { remoteAddress: '203.0.113.10' },
    headers: {},
  } as unknown as Request;

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows requests up to the configured limit', () => {
    const guard = new RateLimitGuard({ limit: 3, windowMs: 60_000 });

    expect(guard.canActivate(context('/auth/login'))).toBe(true);
    expect(guard.canActivate(context('/auth/login'))).toBe(true);
    expect(guard.canActivate(context('/auth/login'))).toBe(true);
  });

  it('rejects the next request past the limit with 429', () => {
    const guard = new RateLimitGuard({ limit: 2, windowMs: 60_000 });

    guard.canActivate(context('/auth/login'));
    guard.canActivate(context('/auth/login'));

    try {
      guard.canActivate(context('/auth/login'));
      throw new Error('expected a rejection');
    } catch (err) {
      const status = (err as { getStatus?: () => number }).getStatus?.();
      expect(status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('keeps separate counters per route', () => {
    const guard = new RateLimitGuard({ limit: 1, windowMs: 60_000 });

    // Same IP, different endpoint: a login storm must not lock out checkout.
    expect(guard.canActivate(context('/auth/login'))).toBe(true);
    expect(guard.canActivate(context('/auth/refresh'))).toBe(true);
  });

  it('accepts an x-forwarded-for client identity', () => {
    const guard = new RateLimitGuard({ limit: 1, windowMs: 60_000 });
    const request = {
      path: '/auth/login',
      method: 'POST',
      ip: undefined,
      headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' },
    } as unknown as Request;
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
