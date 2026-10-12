import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

interface Captured {
  status: number;
  body: { message: unknown; statusCode: number };
}

/**
 * Runs the filter over an exception and returns what it wrote to the response,
 * which is the only contract a client ever sees.
 */
function run(exception: unknown): Captured {
  const filter = new AllExceptionsFilter();
  const request = { method: 'POST', path: '/api/v1/orders' } as never;
  const captured: Partial<Captured> = {};

  const response = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: { message: unknown; statusCode: number }) {
      captured.body = payload;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  filter.catch(exception, host);

  return {
    status: captured.status ?? 0,
    body: captured.body as Captured['body'],
  };
}

describe('AllExceptionsFilter', () => {
  it('forwards a plain exception string so the UI can explain the failure', () => {
    const captured = run(new BadRequestException('Đơn hàng chưa có mã địa chỉ'));

    expect(captured.status).toBe(400);
    expect(captured.body.message).toBe('Đơn hàng chưa có mã địa chỉ');
  });

  it('forwards ValidationPipe string arrays', () => {
    const captured = run(
      new BadRequestException({ message: ['sku must be a string'] } as never),
    );

    expect(captured.body.message).toEqual(['sku must be a string']);
  });

  it('collapses a non-string message so internals stay hidden', () => {
    const captured = run(
      new BadRequestException({
        message: { internal: 'postgres://neon:secret@host/db' },
      } as never),
    );

    expect(captured.body.message).toBe('Request failed');
  });

  it('collapses an unhandled error to a 500 with no stack', () => {
    const captured = run(new Error('connect ECONNREFUSED 127.0.0.1:5432'));

    expect(captured.status).toBe(500);
    expect(captured.body.message).toBe('Internal server error');
  });
});
