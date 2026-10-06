import { createHmac } from 'node:crypto';
import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

const SANDBOX_CREATE = 'https://test-payment.momo.vn/v2/gateway/api/create';
const LIVE_CREATE = 'https://payment.momo.vn/v2/gateway/api/create';

const REQUEST_FIELDS = [
  'accessKey',
  'amount',
  'extraData',
  'ipnUrl',
  'orderId',
  'orderInfo',
  'partnerCode',
  'redirectUrl',
  'requestId',
  'requestType',
] as const;

const RESPONSE_FIELDS = [
  'accessKey',
  'amount',
  'extraData',
  'message',
  'orderId',
  'orderInfo',
  'orderType',
  'partnerCode',
  'payType',
  'qrcodeUrl',
  'requestId',
  'responseTime',
  'resultCode',
  'transId',
] as const;

function buildRaw(params: Record<string, unknown>, fields: readonly string[]): string {
  return fields
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');
}

function safeOrderInfo(orderId: string): string {
  return `PC Store order ${orderId}`.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 50);
}

export class MomoPaymentProvider implements PaymentProvider {
  readonly name = 'momo';
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly redirectUrl: string;
  private readonly ipnUrl: string;
  private readonly requestType: string;

  constructor(configGetter: (key: string) => string | undefined) {
    this.partnerCode = configGetter('MOMO_PARTNER_CODE') ?? '';
    this.accessKey = configGetter('MOMO_ACCESS_KEY') ?? '';
    this.secretKey = configGetter('MOMO_SECRET_KEY') ?? '';
    this.redirectUrl = configGetter('MOMO_REDIRECT_URL') ?? '';
    this.ipnUrl = configGetter('MOMO_IPN_URL') ?? this.redirectUrl;
    this.requestType = configGetter('MOMO_REQUEST_TYPE') ?? 'captureWallet';
    const mode = (configGetter('MOMO_MODE') ?? 'sandbox').toLowerCase();
    this.endpoint = mode === 'live' ? LIVE_CREATE : SANDBOX_CREATE;
  }

  private sign(params: Record<string, unknown>): string {
    return createHmac('sha256', this.secretKey)
      .update(buildRaw(params, REQUEST_FIELDS))
      .digest('hex');
  }

  async create(order: OrderForPayment): Promise<CheckoutResult> {
    if (!this.partnerCode || !this.accessKey || !this.secretKey || !this.redirectUrl) {
      throw new Error('MoMo is not configured (MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY / MOMO_REDIRECT_URL)');
    }

    const amount = Math.round(order.total);
    if (amount <= 0) {
      throw new Error('MoMo amount must be a positive integer (VND)');
    }

    const params: Record<string, unknown> = {
      partnerCode: this.partnerCode,
      partnerName: 'PC Store',
      storeId: 'PCSTORE',
      accessKey: this.accessKey,
      requestId: `${order.id}-${Date.now().toString(36)}`,
      amount: String(amount),
      orderId: order.id,
      orderInfo: safeOrderInfo(order.id),
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      extraData: '',
      requestType: this.requestType,
      lang: 'vi',
    };
    params.sig = this.sign(params);

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const body = (await res.json().catch(() => null)) as {
      resultCode?: number | string;
      message?: string;
      localMessage?: string;
      payUrl?: string;
      transId?: string;
    } | null;

    if (!res.ok || !body || (Number(body.resultCode) !== 0 && body.resultCode !== '0')) {
      const message =
        body?.localMessage ?? body?.message ?? `MoMo create failed (HTTP ${res.status})`;
      throw new Error(`MoMo create failed: ${message}`);
    }

    return {
      provider: this.name,
      status: 'pending',
      amount: order.total,
      currency: order.currency ?? 'VND',
      checkoutUrl: body.payUrl,
    };
  }

  private verifySignature(params: Record<string, unknown>): boolean {
    const provided = String(params.signature ?? params.sig ?? '');
    if (!provided) return false;
    const expected = createHmac('sha256', this.secretKey)
      .update(buildRaw(params, RESPONSE_FIELDS))
      .digest('hex');
    if (expected === provided) return true;
    const withoutQr = createHmac('sha256', this.secretKey)
      .update(buildRaw({ ...params, qrcodeUrl: undefined }, RESPONSE_FIELDS))
      .digest('hex');
    return withoutQr === provided;
  }

  async verify(
    params: Record<string, string>,
    order: OrderForPayment,
  ): Promise<boolean> {
    if (!this.secretKey) return false;
    if (params.orderId !== order.id) return false;
    if (String(params.resultCode ?? '') !== '0') return false;
    return this.verifySignature(params);
  }

  verifyIpn(body: Record<string, unknown>): boolean {
    if (!this.secretKey) return false;
    if (String(body.resultCode ?? '') !== '0') return false;
    return this.verifySignature(body);
  }
}