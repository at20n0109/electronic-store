import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaypalPaymentProvider } from './paypal.provider.js';

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
    PAYPAL_MODE: 'sandbox',
    PAYPAL_CLIENT_ID: 'client-id',
    PAYPAL_SECRET: 'client-secret',
    PAYPAL_USD_RATE: '25000',
    PAYPAL_CURRENCY: 'USD',
    PAYPAL_RETURN_URL: 'https://app/api/v1/payments/paypal/return',
    PAYPAL_CANCEL_URL: 'https://app/checkout',
  };
  return (key: string) => extra[key] ?? base[key];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PaypalPaymentProvider', () => {
  it('creates a checkout order and returns the approve link', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'AT123', expires_in: 3200 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'PAYID-ABC',
          status: 'CREATED',
          links: [
            { rel: 'self', href: 'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYID-ABC' },
            {
              rel: 'approve',
              href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYID-ABC',
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetcher);

    const provider = new PaypalPaymentProvider(configGetter());
    const result = await provider.create(order as never);

    expect(result.provider).toBe('paypal');
    expect(result.status).toBe('pending');
    expect(result.checkoutUrl).toBe(
      'https://www.sandbox.paypal.com/checkoutnow?token=PAYID-ABC',
    );

    const createCall = fetcher.mock.calls[1][0];
    expect(createCall).toContain('/v2/checkout/orders');
    const createBody = JSON.parse(fetcher.mock.calls[1][1].body as string);
    expect(createBody.purchase_units[0]).toMatchObject({
      reference_id: order.id,
      amount: { currency_code: 'USD', value: '10.00' },
    });
    expect(createBody.application_context.return_url).toContain(
      '/payments/paypal/return',
    );
  });

  it('captures a completed order and extracts reference id', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'AT456', expires_in: 3200 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'COMPLETED',
          purchase_units: [
            {
              reference_id: order.id,
              captures: [{ id: 'EX1401', status: 'COMPLETED' }],
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetcher);

    const provider = new PaypalPaymentProvider(configGetter());
    const result = await provider.capture('PAYID-ABC');

    expect(result.succeeded).toBe(true);
    expect(result.orderId).toBe(order.id);
    expect(result.transactionId).toBe('EX1401');
    expect(fetcher.mock.calls[1][0]).toContain('/v2/checkout/orders/PAYID-ABC/capture');
  });

  it('reports not succeeded for non-completed captures', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'AT789', expires_in: 3200 }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: 'PENDING' }));
    vi.stubGlobal('fetch', fetcher);

    const provider = new PaypalPaymentProvider(configGetter());
    const result = await provider.capture('PAYID-XXX');

    expect(result.succeeded).toBe(false);
    expect(result.orderId).toBeUndefined();
  });
});