import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZalopayPaymentProvider } from './zalopay.provider.js';

const APP_ID = '2553';
const KEY1 = 'REMOVED-TEST-ONLY-SECRET';
const KEY2 = 'REMOVED-TEST-ONLY-SECRET';
const CALLBACK_URL = 'https://app/api/v1/payments/zalopay/callback';
const REDIRECT_URL = 'https://app/api/v1/payments/zalopay/return';

function configGetter(extra: Record<string, string> = {}) {
  const base: Record<string, string> = {
    ZALOPAY_APP_ID: APP_ID,
    ZALOPAY_KEY1: KEY1,
    ZALOPAY_KEY2: KEY2,
    ZALOPAY_MODE: 'sandbox',
    ZALOPAY_CALLBACK_URL: CALLBACK_URL,
    ZALOPAY_REDIRECT_URL: REDIRECT_URL,
  };
  return (key: string) => extra[key] ?? base[key];
}

const order = {
  id: 'order-zalo-1',
  userId: 'user-1',
  subtotal: 150000,
  shipping: 0,
  total: 150000,
  currency: 'VND',
  items: [{ productId: 'p1', name: 'CPU', price: 150000, quantity: 1 }],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ZalopayPaymentProvider', () => {
  it('creates a checkout and produces the sandbox order_url', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        return_code: 1,
        return_message: 'success',
        sub_return_code: 1,
        order_url: 'https://sb-openapi.zalopay.vn/app/?apptransid=xxx',
      }),
    );
    vi.stubGlobal('fetch', fetcher);

    const provider = new ZalopayPaymentProvider(configGetter());
    const result = await provider.create(order as never);

    expect(result.provider).toBe('zalopay');
    expect(result.status).toBe('pending');
    expect(result.checkoutUrl).toContain('sb-openapi.zalopay.vn');

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toContain('/v2/create');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      app_id: APP_ID,
      amount: '150000',
      app_user: 'user-1',
      callback_url: CALLBACK_URL,
    });
    expect(body.app_trans_id).toMatch(/^\d{8}_\d{10}$/);
    expect(JSON.parse(body.item)).toHaveLength(1);
    expect(JSON.parse(body.embed_data)).toMatchObject({ orderId: 'order-zalo-1' });
    expect(body.mac).toBeTruthy();
  });

  it('throws when the gateway reports a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ return_code: 2, return_message: 'failure' }),
      ),
    );

    const provider = new ZalopayPaymentProvider(configGetter());
    await expect(provider.create(order as never)).rejects.toThrow(
      'ZaloPay create failed',
    );
  });

  it('throws when ZaloPay is not configured', async () => {
    const provider = new ZalopayPaymentProvider(() => undefined);
    await expect(provider.create(order as never)).rejects.toThrow(
      'not configured',
    );
  });

  it('verifies a valid callback mac computed with key2', () => {
    const data = JSON.stringify({
      app_id: APP_ID,
      app_trans_id: '20261007_1234567890',
      app_user: 'user-1',
      amount: 150000,
      embed_data: JSON.stringify({ redirecturl: REDIRECT_URL, orderId: 'order-zalo-1' }),
      status: 1,
      zp_trans_id: 'zp123',
    });
    const mac = createHmac('sha256', KEY2).update(data).digest('hex');

    const provider = new ZalopayPaymentProvider(configGetter());
    const { valid, data: parsed } = provider.verifyCallback({ data, mac });
    expect(valid).toBe(true);
    const embed = JSON.parse(parsed?.embed_data as string) as {
      redirecturl?: string;
      orderId?: string;
    };
    expect(embed.orderId).toBe('order-zalo-1');
    expect(embed.redirecturl).toBe(REDIRECT_URL);
  });

  it('rejects a callback with a wrong mac', () => {
    const provider = new ZalopayPaymentProvider(configGetter());
    const { valid } = provider.verifyCallback({
      data: JSON.stringify({ status: 1 }),
      mac: 'deadbeef',
    });
    expect(valid).toBe(false);
  });
});