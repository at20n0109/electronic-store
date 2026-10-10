import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

export interface RateLimitOptions {
  /** Maximum number of requests allowed inside `windowMs`. */
  limit: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
  /** Message returned as 429 when the limit is exceeded. */
  message?: string;
}

interface Entry {
  hits: number;
  resetAt: number;
}

class TooManyRequests extends HttpException {
  constructor(message: string) {
    super({ statusCode: 429, message }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/**
 * In-process sliding-window limiter used to throttle credential and OTP
 * brute-force attempts.
 *
 * This is deliberately simple: it only protects a single instance. Deployments
 * that scale horizontally must add an edge rate limiter or a shared store
 * (Redis) — an in-memory counter alone cannot enforce a global limit.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly options: RateLimitOptions;
  private readonly buckets = new Map<string, Entry>();

  constructor(options?: Partial<RateLimitOptions>) {
    this.options = { limit: 5, windowMs: 60_000, ...options };
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = this.resolveKey(req);
    const now = Date.now();

    let entry = this.buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { hits: 0, resetAt: now + this.options.windowMs };
      this.buckets.set(key, entry);
    }
    entry.hits += 1;

    // Opportunistic cleanup keeps the map bounded on long-lived processes.
    if (this.buckets.size > 10_000) {
      for (const [k, v] of this.buckets) {
        if (v.resetAt <= now) this.buckets.delete(k);
      }
    }

    if (entry.hits > this.options.limit) {
      Logger.warn(
        `Rate limit exceeded for ${key} (${entry.hits}/${this.options.limit})`,
        'RateLimitGuard',
      );
      throw new TooManyRequests(
        this.options.message ??
          'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
      );
    }

    return true;
  }

  private resolveKey(req: Request): string {
    const route = `${req.method} ${req.route?.path ?? req.path}`;
    const userId = (req as unknown as { user?: { id?: string } }).user?.id;
    return userId
      ? `${route}|user:${userId}`
      : `${route}|ip:${clientIp(req)}`;
  }
}

/** Client IP honouring the first proxy hop when present. */
export function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}
