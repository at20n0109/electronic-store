import { createHmac } from 'node:crypto';
import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

const SANDBOX_CREATE = 'https://sb-openapi.zalopay.vn/v2/create';
const LIVE_CREATE = 'https://openapi.zalopay.vn/v2/create';
const SANDBOX_QUERY = 'https://sb-openapi.zalopay.vn/v2/query';
const LIVE_QUERY = 'https://openapi.zalopay.vn/v2/query';

/** Cấu hình qua env: ZALOPAY_APP_ID / ZALOPAY_KEY1 / ZALOPAY_KEY2 / ZALOPAY_MODE / ZALOPAY_CALLBACK_URL / ZALOPAY_REDIRECT_URL */
export class ZalopayPaymentProvider implements PaymentProvider {
  readonly name = 'zalopay';
  private readonly appId: string;
  private readonly key1: string;
  private readonly key2: string;
  private readonly createEndpoint: string;
  private readonly queryEndpoint: string;
  private readonly callbackUrl: string;
  private readonly redirectUrl: string;

  constructor(configGetter: (key: string) => string | undefined) {
    this.appId = configGetter('ZALOPAY_APP_ID') ?? '';
    this.key1 = configGetter('ZALOPAY_KEY1') ?? '';
    this.key2 = configGetter('ZALOPAY_KEY2') ?? '';
    this.callbackUrl = configGetter('ZALOPAY_CALLBACK_URL') ?? '';
    this.redirectUrl = configGetter('ZALOPAY_REDIRECT_URL') ?? '';
    const mode = (configGetter('ZALOPAY_MODE') ?? 'sandbox').toLowerCase();
    this.createEndpoint = mode === 'live' ? LIVE_CREATE : SANDBOX_CREATE;
    this.queryEndpoint = mode === 'live' ? LIVE_QUERY : SANDBOX_QUERY;
  }

  private hmac(key: string, data: string): string {
    return createHmac('sha256', key).update(data).digest('hex');
  }

  isConfigured(): boolean {
    return Boolean(this.appId && this.key1 && this.key2);
  }

  async create(order: OrderForPayment): Promise<CheckoutResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'ZaloPay is not configured (ZALOPAY_APP_ID / ZALOPAY_KEY1 / ZALOPAY_KEY2)',
      );
    }

    const amount = Math.round(order.total);
    if (amount <= 0) {
      throw new Error('ZaloPay amount must be a positive integer (VND)');
    }

    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}${String(now.getDate()).padStart(2, '0')}`;
    const appTransId = `${ymd}_${String(Date.now()).slice(-10)}`;
    const appTime = Date.now();

    const items = order.items.map((item) => ({
      itemid: item.productId,
      itemname: item.name,
      itemprice: item.price,
      itemquantity: item.quantity,
    }));

    const embedData = JSON.stringify({
      redirecturl: this.redirectUrl,
      orderId: order.id,
    });

    const macData = [
      this.appId,
      appTransId,
      order.userId.slice(0, 24) || 'pcstore',
      String(amount),
      String(appTime),
      embedData,
      JSON.stringify(items),
    ].join('|');

    const body: Record<string, string> = {
      app_id: this.appId,
      app_user: order.userId.slice(0, 24) || 'pcstore',
      app_time: String(appTime),
      amount: String(amount),
      app_trans_id: appTransId,
      embed_data: embedData,
      item: JSON.stringify(items),
      description: `PC Store order ${order.id}`
        .replace(/[^A-Za-z0-9 _-]/g, '')
        .slice(0, 120),
      callback_url: this.callbackUrl,
      mac: this.hmac(this.key1, macData),
    };

    const res = await fetch(this.createEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const response = (await res.json().catch(() => null)) as {
      return_code?: number | string;
      return_message?: string;
      sub_return_code?: number | string;
      order_url?: string;
      zp_trans_token?: string;
    } | null;

    if (!res.ok || !response) {
      throw new Error(`ZaloPay create failed (HTTP ${res.status})`);
    }

    if (Number(response.return_code) !== 1) {
      const reason =
        Number(response.sub_return_code) === 2
          ? 'Người dùng chưa cài đặt ZaloPay'
          : (response.return_message ?? `return_code=${response.return_code}`);
      throw new Error(`ZaloPay create failed: ${reason}`);
    }

    return {
      provider: this.name,
      status: 'pending',
      amount: order.total,
      currency: order.currency,
      checkoutUrl: response.order_url,
      details: { appTransId },
    };
  }

  /**
   * Xác thực callback từ ZaloPay (server-to-server).
   * Body: { data: "<json string>", mac: "<hmac-sha256(data, key2)>", type }
   */
  verifyCallback(body: { data?: string; mac?: string }): {
    valid: boolean;
    data?: Record<string, unknown>;
  } {
    if (!this.key2 || !body.data || !body.mac) {
      return { valid: false };
    }
    const expected = this.hmac(this.key2, body.data);
    if (expected !== body.mac) {
      return { valid: false };
    }
    try {
      return { valid: true, data: JSON.parse(body.data) };
    } catch {
      return { valid: false };
    }
  }

  /** Truy vấn trạng thái giao dịch (dùng khi return mà callback chưa về). */
  async queryStatus(appTransId: string): Promise<{
    succeeded: boolean;
    transactionId?: string;
    raw?: unknown;
  }> {
    if (!this.isConfigured()) {
      return { succeeded: false };
    }
    const mac = this.hmac(
      this.key1,
      `${this.appId}|${appTransId}|${this.key1}`,
    );
    const res = await fetch(this.queryEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        app_trans_id: appTransId,
        mac,
      }),
    });
    const body = (await res.json().catch(() => null)) as {
      return_code?: number | string;
      status?: number | string;
      zp_trans_id?: string;
    } | null;
    if (!res.ok || !body || Number(body.return_code) !== 1) {
      return { succeeded: false, raw: body };
    }
    return {
      succeeded: Number(body.status) === 1,
      transactionId: body.zp_trans_id,
      raw: body,
    };
  }
}