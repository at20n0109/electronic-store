import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CryptoService } from '../crypto/crypto.service.js';
import { PaymentsService } from './payments.service.js';

const BANK_INFO = JSON.stringify({
  bank: 'Vietcombank',
  accountName: 'PC Store',
  accountNumber: '0123456789',
});

function buildService(config: Record<string, string> = {}) {
  const env: Record<string, string> = {
    BANK_TRANSFER_INFO: BANK_INFO,
    ...config,
  };
  const get = {
    get: <T>(key: string): T | undefined => env[key] as T | undefined,
  } as unknown as ConfigService;
  const prisma = {} as unknown as PrismaService;
  const crypto = {} as unknown as CryptoService;

  return new PaymentsService(get, prisma, crypto);
}

function isProviderSelectable(
  service: PaymentsService,
  provider: string | undefined,
): boolean {
  try {
    void service['resolve'](provider);
    return true;
  } catch {
    return false;
  }
}

describe('PaymentsService provider gating', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('does not accept an explicitly requested mock provider', () => {
    const service = buildService();
    expect(isProviderSelectable(service, 'mock')).toBe(false);
  });

  it('does not accept an explicitly requested atm-mock provider', () => {
    const service = buildService();
    expect(isProviderSelectable(service, 'atm-mock')).toBe(false);
  });

  it('accepts mock only with an explicit sandbox opt-in', () => {
    const service = buildService({ ALLOW_MOCK_PAYMENT: '1' });
    expect(isProviderSelectable(service, 'mock')).toBe(true);
  });

  it('refuses mock in production even with the sandbox opt-in', () => {
    process.env.NODE_ENV = 'production';
    const service = buildService({ ALLOW_MOCK_PAYMENT: '1' });
    expect(isProviderSelectable(service, 'mock')).toBe(false);
  });

  it('refuses a default provider that is not configured', () => {
    // PAYMENT_PROVIDER defaults to mock, which must not silently succeed.
    const service = buildService({ PAYMENT_PROVIDER: 'mock' });
    expect(isProviderSelectable(service, undefined)).toBe(false);
  });

  it('refuses an unknown provider name', () => {
    const service = buildService();
    expect(isProviderSelectable(service, 'definitely-not-a-provider')).toBe(false);
  });

  it('refuses a configured-but-unverified provider', () => {
    // The name resolves to a real provider, but without its credentials it must
    // not be selectable.
    const service = buildService();
    expect(isProviderSelectable(service, 'vnpay')).toBe(false);
  });

  it('accepts cod, which needs no secrets', () => {
    const service = buildService();
    expect(isProviderSelectable(service, 'cod')).toBe(true);
  });

  it('throws a 400-shaped error for a disabled provider', () => {
    const service = buildService();
    expect(() => service['resolve']('mock')).toThrow(BadRequestException);
  });
});
