import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodPaymentProvider } from './cod.provider.js';

const order = {
  id: 'order-cod-1',
  userId: 'user-1',
  subtotal: 350000,
  shipping: 30000,
  total: 380000,
  currency: 'VND',
  items: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CodPaymentProvider', () => {
  it('creates a pending COD checkout without a redirect url', async () => {
    const result = await new CodPaymentProvider().create(order as never);

    expect(result.provider).toBe('cod');
    expect(result.status).toBe('pending');
    expect(result.amount).toBe(380000);
    expect(result.currency).toBe('VND');
    expect(result.checkoutUrl).toBeUndefined();
    expect(result.details).toMatchObject({ message: expect.stringContaining('COD') });
  });

  it('does not successfully complete a payment by itself', async () => {
    const result = await new CodPaymentProvider().create(order as never);
    expect(result.status).not.toBe('succeeded');
  });
});