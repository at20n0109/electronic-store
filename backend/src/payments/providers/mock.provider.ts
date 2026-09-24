import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async create(
    _order: OrderForPayment,
    _ip?: string,
    _userAgent?: string,
  ): Promise<CheckoutResult> {
    return {
      provider: this.name,
      status: 'succeeded',
      amount: _order.total,
      currency: _order.currency,
    };
  }

  async verify(
    _params: Record<string, string>,
    _order: OrderForPayment,
  ): Promise<boolean> {
    return true;
  }
}
