import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  VnpayPaymentProvider,
  vnpayOrderIdFromTxnRef,
} from './vnpay.provider.js';

const TMN_CODE = 'NON3GCUI';
const HASH_SECRET = 'REMOVED-TEST-ONLY-SECRET';
const RETURN_URL = 'https://app/payment/return';

const phpEncode = (value: string) =>
  encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');

function configGetter(extra: Record<string, string> = {}) {
  const base: Record<string, string> = {
    PAYMENT_VNPAY_TMN_CODE: TMN_CODE,
    PAYMENT_VNPAY_HASH_SECRET: HASH_SECRET,
    PAYMENT_VNPAY_RETURN_URL: RETURN_URL,
    PAYMENT_VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  };
  return (key: string) => extra[key] ?? base[key];
}

const order = {
  id: 'order-vnpay-1',
  userId: 'user-1',
  subtotal: 150000,
  shipping: 0,
  total: 150000,
  currency: 'VND',
  items: [{ productId: 'p1', name: 'CPU', price: 150000, quantity: 1 }],
};

describe('VnpayPaymentProvider', () => {
  it('creates a signed sandbox checkout url with sha512 + php urlencode', async () => {
    const provider = new VnpayPaymentProvider(configGetter());
    const result = await provider.create(order as never);

    expect(result.provider).toBe('vnpay');
    expect(result.status).toBe('pending');
    expect(result.checkoutUrl).toContain('sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(result.checkoutUrl).toContain(`vnp_TmnCode=${TMN_CODE}`);
    expect(result.checkoutUrl).toContain(`vnp_Amount=15000000`);
    expect(result.checkoutUrl).toContain(
      `vnp_OrderInfo=${phpEncode('Thanh toan don hang order-vnpay-1')}`,
    );
    expect(result.checkoutUrl).toContain(`vnp_ReturnUrl=${phpEncode(RETURN_URL)}`);
    expect(result.checkoutUrl).not.toContain('vnp_IpnUrl');

    const url = new URL(result.checkoutUrl!);
    const params: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      if (k === 'vnp_SecureHash') continue;
      params[k] = v;
    }
    const query = Object.keys(params)
      .sort()
      .map((key) => `${key}=${phpEncode(params[key])}`)
      .join('&');
    const expected = createHmac('sha512', HASH_SECRET).update(query).digest('hex');
    expect(url.searchParams.get('vnp_SecureHash')).toBe(expected);
  });

  it('embeds a parseable txn ref', async () => {
    const provider = new VnpayPaymentProvider(configGetter());
    const result = await provider.create(order as never);
    const url = new URL(result.checkoutUrl!);
    const txnRef = url.searchParams.get('vnp_TxnRef');
    expect(txnRef).toMatch(/^ORDorder-vnpay-1\d{14}$/);
  });

  it('verifies a callback signature signed with sha512 + php urlencode', async () => {
    const provider = new VnpayPaymentProvider(configGetter());
    const raw: Record<string, string> = {
      vnp_Amount: '15000000',
      vnp_Command: 'pay',
      vnp_ResponseCode: '00',
      vnp_TmnCode: TMN_CODE,
      vnp_TransactionNo: '12818577',
      vnp_TxnRef: 'ORDorder-vnpay-120261007120000',
      vnp_Version: '2.1.0',
    };
    const query = Object.keys(raw)
      .sort()
      .map((key) => `${key}=${phpEncode(raw[key])}`)
      .join('&');
    const hash = createHmac('sha512', HASH_SECRET).update(query).digest('hex');

    expect(await provider.verify({ ...raw, vnp_SecureHash: hash }, order as never)).toBe(
      true,
    );
    expect(
      await provider.verify({ ...raw, vnp_SecureHash: 'deadbeef' }, order as never),
    ).toBe(false);
  });

  it('parses the order id out of a txn ref', () => {
    expect(vnpayOrderIdFromTxnRef('ORDorder-vnpay-120261007120000')).toBe(
      'order-vnpay-1',
    );
    expect(vnpayOrderIdFromTxnRef('not-a-txnref')).toBeNull();
    expect(vnpayOrderIdFromTxnRef(undefined as never)).toBeNull();
  });
});