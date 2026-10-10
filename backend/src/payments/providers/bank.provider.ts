import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

export interface BankAccountInfo {
  bank: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  holder?: string;
  amountNote?: string;
}

/**
 * Chuyển khoản ngân hàng (bank transfer). Không có cổng thanh toán phần mềm:
 * đơn order đặt tạm, chuyển khoản tới số tài khoản của cửa hàng, nhân viên xác
 * nhận tiền về rồi đổi trạng thái đơn thành PAID.
 */
export class BankTransferProvider implements PaymentProvider {
  readonly name = 'bank';
  private readonly info: BankAccountInfo;

  constructor(configGetter: (key: string) => string | undefined) {
    const configured = BankTransferProvider.parse(
      configGetter('BANK_TRANSFER_INFO'),
    );
    if (!configured.accountNumber) {
      throw new Error(
        'BANK_TRANSFER_INFO must be valid JSON containing bank, ' +
          'accountName and accountNumber. Store no account details in code.',
      );
    }
    this.info = configured;
  }

  static parse(raw: string | undefined): BankAccountInfo {
    if (!raw) {
      return {
        bank: '',
        accountName: '',
        accountNumber: '',
      };
    }
    try {
      const parsed = JSON.parse(raw) as Partial<BankAccountInfo>;
      return {
        bank: parsed.bank ?? '',
        accountName: parsed.accountName ?? '',
        accountNumber: parsed.accountNumber ?? '',
        branch: parsed.branch,
        holder: parsed.holder,
        amountNote: parsed.amountNote,
      };
    } catch {
      return {
        bank: '',
        accountName: '',
        accountNumber: '',
      };
    }
  }

  getDetails(): Record<string, unknown> {
    return { message: 'Chuyển khoản ngân hàng', bankAccount: this.info };
  }

  async create(order: OrderForPayment): Promise<CheckoutResult> {
    return {
      provider: this.name,
      status: 'pending',
      amount: order.total,
      currency: order.currency,
      details: {
        message:
          'Vui lòng chuyển khoản đúng số tiền và nội dung bên dưới. Đơn hàng sẽ được xác nhận sau khi nhận được tiền.',
        bankAccount: this.info,
      },
    };
  }
}