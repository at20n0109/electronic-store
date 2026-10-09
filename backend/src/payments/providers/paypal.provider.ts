import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

const SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const LIVE_API = 'https://api-m.paypal.com';

export interface PaypalCaptureResult {
  succeeded: boolean;
  orderId?: string;
  transactionId?: string;
}

export class PaypalPaymentProvider implements PaymentProvider {
  readonly name = 'paypal';
  private readonly clientId: string;
  private readonly secret: string;
  private readonly mode: string;
  private readonly api: string;
  private readonly returnUrl: string;
  private readonly cancelUrl: string;
  private readonly currency: string;
  private readonly usdRate: number;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(configGetter: (key: string) => string | undefined) {
    const mode = (configGetter('PAYPAL_MODE') ?? 'sandbox').toLowerCase();
    this.mode = mode === 'live' ? 'live' : 'sandbox';
    this.clientId = configGetter('PAYPAL_CLIENT_ID') ?? '';
    this.secret = configGetter('PAYPAL_SECRET') ?? '';
    this.currency = (configGetter('PAYPAL_CURRENCY') ?? 'USD').toUpperCase();
    this.usdRate = Number(configGetter('PAYPAL_USD_RATE') ?? 25000);
    this.api = mode === 'live' ? LIVE_API : SANDBOX_API;
    this.returnUrl = configGetter('PAYPAL_RETURN_URL') ?? '';
    this.cancelUrl = configGetter('PAYPAL_CANCEL_URL') ?? '';
  }

  getDetails(): Record<string, unknown> {
    return { mode: this.mode };
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }
    const basic = Buffer.from(`${this.clientId}:${this.secret}`).toString('base64');
    const res = await fetch(`${this.api}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const ttl = ((data.expires_in ?? 3599) - 60) * 1000;
    this.tokenCache = { token: data.access_token, expiresAt: Date.now() + ttl };
    return data.access_token;
  }

  private toPayPalAmount(order: OrderForPayment): string {
    const value = Math.round((order.total / this.usdRate) * 100) / 100;
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('PayPal amount must be a positive number');
    }
    return value.toFixed(2);
  }

  async create(order: OrderForPayment): Promise<CheckoutResult> {
    const token = await this.getToken();

    const res = await fetch(`${this.api}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.id,
            description: `PC Store order ${order.id}`.slice(0, 127),
            amount: {
              currency_code: this.currency,
              value: this.toPayPalAmount(order),
            },
          },
        ],
        application_context: {
          brand_name: 'PC Store',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: this.returnUrl,
          cancel_url: this.cancelUrl,
        },
      }),
    });

    const body = (await res.json()) as {
      id?: string;
      status?: string;
      links?: Array<{ rel: string; href: string }>;
      message?: string;
      details?: Array<{ issue: string }>;
    };
    if (!res.ok || !body.id) {
      const issue =
        body.details?.map((detail) => detail.issue).join(', ') ??
        body.message ??
        res.statusText;
      throw new Error(`PayPal create order failed: ${res.status} ${issue}`);
    }

    const approve = body.links?.find((link) => link.rel === 'approve')?.href;
    if (!approve) {
      throw new Error('PayPal did not return an approve link');
    }

    return {
      provider: this.name,
      status: 'pending',
      amount: order.total,
      currency: order.currency,
      checkoutUrl: approve,
    };
  }

  async capture(payPalOrderId: string): Promise<PaypalCaptureResult> {
    const token = await this.getToken();

    const res = await fetch(
      `${this.api}/v2/checkout/orders/${encodeURIComponent(payPalOrderId)}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    const body = (await res.json().catch(() => null)) as {
      status?: string;
      purchase_units?: Array<{
        reference_id?: string;
        captures?: Array<{ id?: string; status?: string }>;
      }>;
      message?: string;
    } | null;

    if (!res.ok) {
      throw new Error(`PayPal capture failed: ${res.status} ${body?.message ?? res.statusText}`);
    }
    if (body?.status !== 'COMPLETED') {
      return { succeeded: false };
    }

    const unit = body.purchase_units?.[0];
    return {
      succeeded: true,
      orderId: unit?.reference_id,
      transactionId: unit?.captures?.[0]?.id,
    };
  }
}