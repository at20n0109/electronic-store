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

/**
 * PHP urlencode semantics (space => '+'), which is what VNPay uses when it
 * builds the signed query string on both directions.
 */
function vnpUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

const TXN_REF_PATTERN = /^ORD(.+?)(\d{14})$/;

export function vnpayOrderIdFromTxnRef(txnRef: string): string | null {
  const match = TXN_REF_PATTERN.exec(txnRef);
  return match ? match[1] : null;
}

export class VnpayPaymentProvider implements PaymentProvider {
  readonly name = 'vnpay';
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly endpoint: string;
  private readonly returnUrl: string;

  constructor(configGetter: (key: string) => string | undefined) {
    this.tmnCode = configGetter('PAYMENT_VNPAY_TMN_CODE') ?? '';
    this.hashSecret =
      configGetter('PAYMENT_VNPAY_HASH_SECRET') ?? configGetter('PAYMENT_SECRET') ?? '';
    this.returnUrl = configGetter('PAYMENT_VNPAY_RETURN_URL') ?? '';
    this.endpoint =
      configGetter('PAYMENT_VNPAY_URL') ??
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
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
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_IpAddr: ip,
      vnp_ReturnUrl: this.returnUrl,
      vnp_CreateDate: formatDateTime(now),
      vnp_ExpireDate: formatDateTime(expire),
    };

    const queryData = Object.keys(params)
      .sort()
      .map((key) => `${key}=${vnpUrlEncode(params[key])}`)
      .join('&');
    const secureHash = createHmac('sha512', this.hashSecret)
      .update(queryData)
      .digest('hex');

    const checkoutUrl = `${this.endpoint}?${queryData}&vnp_SecureHash=${secureHash}`;

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

    const verifyParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (key === 'vnp_SecureHash' || key === 'vnp_HashSecret') continue;
      if (value) verifyParams[key] = value;
    }

    const query = Object.keys(verifyParams)
      .sort()
      .map((key) => `${key}=${vnpUrlEncode(verifyParams[key])}`)
      .join('&');
    const expected = createHmac('sha512', this.hashSecret).update(query).digest('hex');
    return expected === secureHash;
  }
}