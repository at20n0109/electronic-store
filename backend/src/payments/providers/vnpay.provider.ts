import { createHmac } from 'node:crypto';
import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function vietnamNow(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

function formatDateTime(d: Date): string {
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join('');
}

function sortParams(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

export class VnpayPaymentProvider implements PaymentProvider {
  readonly name = 'vnpay';
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly endpoint: string;
  private readonly returnUrl: string;
  private readonly ipnUrl: string;

  constructor(configGetter: (key: string) => string | undefined) {
    this.tmnCode = configGetter('PAYMENT_VNPAY_TMN_CODE') ?? '';
    this.hashSecret = configGetter('PAYMENT_SECRET') ?? '';
    this.returnUrl = configGetter('PAYMENT_VNPAY_RETURN_URL') ?? '';
    this.ipnUrl = configGetter('PAYMENT_VNPAY_IPN_URL') ?? this.returnUrl;
    this.endpoint =
      configGetter('PAYMENT_VNPAY_URL') ??
      'https://sandbox.vnpayment.vn/paymentv2/ProcessRequestOTP';
  }

  async create(order: OrderForPayment, ip = '127.0.0.1'): Promise<CheckoutResult> {
    const now = vietnamNow();
    const expire = new Date(now.getTime() + 15 * 60000);

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: String(Math.round(order.total * 100)),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: `ORD${order.id}${formatDateTime(now)}`,
      vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
      vnp_OrderType: '27',
      vnp_Locale: 'vn',
      vnp_IpAddr: ip,
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpnUrl: this.ipnUrl,
      vnp_CreateDate: formatDateTime(now),
      vnp_ExpireDate: formatDateTime(expire),
    };

    const query = sortParams(params);
    const secureHash = createHmac('sha256', this.hashSecret)
      .update(query)
      .digest('hex');

    const checkoutUrl = `${this.endpoint}?${query}&vnp_SecureHash=${secureHash}`;

    return {
      provider: this.name,
      status: 'pending',
      amount: order.total,
      currency: order.currency ?? 'VND',
      checkoutUrl,
    };
  }

  async verify(params: Record<string, string>, _order: OrderForPayment): Promise<boolean> {
    const secureHash = params['vnp_SecureHash'] ?? params['vnp_HashSecret'];
    if (!secureHash) return false;

    const verifyParams: Record<string, string> = { ...params };
    delete verifyParams['vnp_SecureHash'];
    delete verifyParams['vnp_HashSecret'];

    const query = sortParams(verifyParams);
    const expected = createHmac('sha256', this.hashSecret).update(query).digest('hex');
    return expected === secureHash;
  }
}
