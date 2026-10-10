import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MomoPaymentProvider } from './momo.provider.js';

// Test fixtures only. These are deliberately self-describing placeholders
// rather than realistic-looking key material, so a secret scanner cannot
// mistake them for a real credential.
const SECRET = 'TEST-ONLY-MOMO-SECRET-KEY-NOT-A-REAL-SECRET';
const ACCESS_KEY = 'TEST-ONLY-MOMO-ACCESS-KEY';

const order = {
  id: 'order-123',
  userId: 'user-1',
  subtotal: 250000,
  shipping: 0,
  total: 250000,
  currency: 'VND',
  items: [],
};

function configGetter(extra: Record<string, string> = {}) {
  const base: Record<string, string> = {
    MOMO_PARTNER_CODE: 'MOMO',
    MOMO_ACCESS_KEY: ACCESS_KEY,
    MOMO_SECRET_KEY: SECRET,
    MOMO_REDIRECT_URL: 'https://app/api/v1/payments/momo/return',
    MOMO_IPN_URL: 'https://app/api/v1/payments/webhook',
    MOMO_MODE: 'sandbox',
    MOMO_REQUEST_TYPE: 'captureWallet',
  };
  return (key: string) => extra[key] ?? base[key];
}

function sign(params: Record<string, unknown>): string {
  return createHmac('sha256', SECRET)
    .update(
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${String(params[key])}`)
        .join('&'),
    )
    .digest('hex');
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function returnParams(): Record<string, string> {
  return {
    partnerCode: 'MOMO',
    accessKey: ACCESS_KEY,
    requestId: 'order-123-a1b2c3',
    amount: '250000',
    orderId: 'order-123',
    orderInfo: 'PC Store order order-123',
    orderType: 'momo_wallet',
    transId: '84700123',
    resultCode: '0',
    message: 'Successful.',
    payType: 'qr',
    responseTime: '1699000000000',
    extraData: '',
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MomoPaymentProvider', () => {
  it('creates a checkout and returns the Momo payUrl', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        partnerCode: 'MOMO',
        orderId: 'order-123',
        requestId: 'order-123-a1b2c3',
        amount: 250000,
        resultCode: 0,
        message: 'Successful.',
        transId: '84700123',
        payUrl: 'https://test-payment.momo.vn/gw_payment/transactionProcessor?t=ABC',
      }),
    );
    vi.stubGlobal('fetch', fetcher);

    const provider = new MomoPaymentProvider(configGetter());
    const result = await provider.create(order as never);

    expect(result.provider).toBe('momo');
    expect(result.status).toBe('pending');
    expect(result.checkoutUrl).toContain('test-payment.momo.vn');

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toContain('/v2/gateway/api/create');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      partnerCode: 'MOMO',
      accessKey: ACCESS_KEY,
      requestType: 'captureWallet',
      redirectUrl: 'https://app/api/v1/payments/momo/return',
    });
    expect(body.amount).toBe('250000');
    expect(body.signature).toBeTruthy();
  });

  it('throws when the gateway reports a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          partnerCode: 'MOMO',
          orderId: 'order-123',
          requestId: 'order-123-a1b2c3',
          amount: 250000,
          resultCode: 10,
          message: 'Giao dịch thất bại',
          localMessage: 'Thông tin giao dịch thất bại',
        }),
      ),
    );

    const provider = new MomoPaymentProvider(configGetter());
    await expect(provider.create(order as never)).rejects.toThrow(
      'Thông tin giao dịch thất bại',
    );
  });

  it('verifies a valid return signature and resultCode', async () => {
    const params = returnParams();
    params.signature = sign(params);

    const provider = new MomoPaymentProvider(configGetter());
    await expect(
      provider.verify(params, order as never),
    ).resolves.toBe(true);
  });

  it('rejects tampered return payloads', async () => {
    const params = returnParams();
    params.signature = sign(params);
    params.amount = '999';

    const provider = new MomoPaymentProvider(configGetter());
    await expect(provider.verify(params, order as never)).resolves.toBe(false);
  });

  it('rejects non-success result codes', async () => {
    const params = returnParams();
    params.resultCode = '17';
    params.signature = sign(params);

    const provider = new MomoPaymentProvider(configGetter());
    await expect(provider.verify(params, order as never)).resolves.toBe(false);
  });

  it('verifies an IPN body including qrcodeUrl', () => {
    const body: Record<string, string> = {
      ...returnParams(),
      qrcodeUrl: 'https://qr.momo.vn/sim/test',
    };
    body.signature = sign(body);

    const provider = new MomoPaymentProvider(configGetter());
    expect(provider.verifyIpn(body)).toBe(true);
  });
});