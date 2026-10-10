import { describe, expect, it } from 'vitest';
import { MockPaymentProvider } from './mock.provider.js';

/**
 * These tests lock in the two properties that make the mock provider safe to
 * ship: it can no longer be registered without an explicit opt-in, and its
 * self-reported "succeeded" status can never write a PAID order.
 *
 * The opt-in itself is enforced in PaymentsService.isEnabled(); here we assert
 * the provider's own behaviour cannot be mistaken for a verified payment.
 */
describe('MockPaymentProvider', () => {
  const order = {
    id: 'order-mock-1',
    userId: 'user-1',
    subtotal: 200000,
    shipping: 0,
    total: 200000,
    currency: 'VND',
    items: [],
  };

  it('reports succeeded but performs no verification', async () => {
    const provider = new MockPaymentProvider();
    const result = await provider.create(order as never);

    // The provider's word is not proof. PaymentsService must not treat this
    // status as authority to settle the order.
    expect(result.status).toBe('succeeded');
    expect(await provider.verify({}, order as never)).toBe(true);
  });
});
