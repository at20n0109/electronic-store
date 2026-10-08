import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

export class AtmMockProvider implements PaymentProvider {
  readonly name = 'atm-mock';

  getDetails(): Record<string, unknown> {
    return {
      message: 'Thanh toán ATM/Internet Banking',
      note: 'Nhập thông tin giao dịch. Dữ liệu được mã hoá an toàn.',
    };
  }

async create(order: OrderForPayment): Promise<CheckoutResult> {
    return {
      provider: this.name,
      status: 'pending',
      amount: order.total,
      currency: order.currency,
      checkoutUrl: null as unknown as string | undefined,
      details: {
        method: 'atm_mock',
        requiresForm: true,
        formFields: [
          { name: 'bank', label: 'Ngân hàng', type: 'text', required: true, maxlength: 64 },
          { name: 'cardNumber', label: 'Số tài khoản/thẻ', type: 'text', required: true, maxlength: 32 },
          { name: 'transRef', label: 'Mã giao dịch', type: 'text', required: true, maxlength: 64 },
          { name: 'amount', label: 'Số tiền chuyển (VND)', type: 'number', required: true },
          { name: 'timestamp', label: 'Thời gian chuyển', type: 'datetime-local', required: true },
          { name: 'note', label: 'Nội dung chuyển khoản', type: 'text', maxlength: 200 },
        ],
        paymentId: `ATM-MOCK-${order.id}`,
      },
    };
  }

  async verify(): Promise<boolean> {
    return true;
  }
}

