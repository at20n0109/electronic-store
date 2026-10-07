import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

/**
 * COD — thanh toán khi nhận hàng. Không có cổng thanh toán: người dùng chỉ
 * đặt cọc đơn, nhân viên/hệ thống sẽ xác nhận đơn khi giao hàng.
 */
export class CodPaymentProvider implements PaymentProvider {
  readonly name = 'cod';

  async create(order: OrderForPayment): Promise<CheckoutResult> {
    return {
      provider: this.name,
      status: 'pending',
      amount: order.total,
      currency: order.currency,
      details: {
        message: 'Thanh toán khi nhận hàng (COD)',
      },
    };
  }
}