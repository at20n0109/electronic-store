import { AtmMockProvider } from './providers/atm-mock.provider.js';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PaymentProvider, PaymentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BankTransferProvider } from './providers/bank.provider.js';
import { CodPaymentProvider } from './providers/cod.provider.js';
import { CryptoService } from '../crypto/crypto.service.js';
import type { AtmSubmitDto } from './dto/atm.dto.js';
import { MockPaymentProvider } from './providers/mock.provider.js';
import { MomoPaymentProvider } from './providers/momo.provider.js';
import { PaypalPaymentProvider } from './providers/paypal.provider.js';
import { StripePaymentProvider } from './providers/stripe.provider.js';
import {
  VnpayPaymentProvider,
  vnpayOrderIdFromTxnRef,
} from './providers/vnpay.provider.js';
import { ZalopayPaymentProvider } from './providers/zalopay.provider.js';
import type {
  OrderForPayment,
  OrderLineItem,
  PaymentProvider as PaymentProviderInterface,
} from './types.js';

const PROVIDER_LABELS: Record<string, string> = {
  mock: 'Thanh toán thử (demo)',
  paypal: 'PayPal',
  momo: 'Ví MoMo',
  zalopay: 'ZaloPay',
  vnpay: 'VNPay',
  stripe: 'Thẻ (Stripe)',
  bank: 'Chuyển khoản ngân hàng',
  cod: 'Thanh toán khi nhận hàng (COD)',
  'atm-mock': 'ATM/Internet Banking (Mock)',
};

const PROVIDER_ORDER: Record<string, number> = {
  momo: 0,
  zalopay: 1,
  paypal: 2,
  vnpay: 3,
  stripe: 4,
  bank: 5,
  cod: 6,
  'atm-mock': 6.5,
  mock: 7,
};

function toOrderForPayment(order: {
  id: string;
  userId: string;
  subtotal: unknown;
  shipping: unknown;
  total: unknown;
  items?: Array<{
    productId: string;
    name: string;
    price: unknown;
    quantity: number;
  }>;
}): OrderForPayment {
  return {
    id: order.id,
    userId: order.userId,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    total: Number(order.total),
    currency: 'VND',
    items: (order.items ?? []).map(
      (i): OrderLineItem => ({
        productId: i.productId,
        name: i.name,
        price: Number(i.price),
        quantity: i.quantity,
      }),
    ),
  };
}

@Injectable()
export class PaymentsService {
  private readonly providers: Record<string, PaymentProviderInterface>;
  private readonly appUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {
    const get = (key: string) => this.config.get<string>(key);
    this.providers = {
      // Only registered when explicitly opted in for a local sandbox; see
      // isEnabled('mock').
      'atm-mock': new AtmMockProvider(),
      bank: new BankTransferProvider(get),
      cod: new CodPaymentProvider(),
    };
    if (this.isEnabled('mock')) {
      this.providers['mock'] = new MockPaymentProvider();
    }
    if (this.isEnabled('momo')) {
      this.providers['momo'] = new MomoPaymentProvider(get);
    }
    if (this.isEnabled('zalopay')) {
      this.providers['zalopay'] = new ZalopayPaymentProvider(get);
    }
    if (this.isEnabled('paypal')) {
      this.providers['paypal'] = new PaypalPaymentProvider(get);
    }
    if (this.isEnabled('vnpay')) {
      this.providers['vnpay'] = new VnpayPaymentProvider(get);
    }
    if (this.isEnabled('stripe')) {
      this.providers['stripe'] = new StripePaymentProvider(get);
    }
    this.appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? '';
  }

  private defaultProvider(): PaymentProviderInterface {
    const chosen =
      (this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock').toLowerCase();
    if (!this.isEnabled(chosen)) {
      throw new BadRequestException(
        `Payment provider "${chosen}" is not configured`,
      );
    }
    return this.providers[chosen] ?? this.providers['cod'];
  }

  private resolve(name: string | undefined): PaymentProviderInterface {
    if (!name) {
      return this.defaultProvider();
    }
    // Only an enabled provider may be selected. This gates out "mock" and
    // "atm-mock" as well as any provider missing its credentials.
    if (!this.isEnabled(name.toLowerCase())) {
      throw new BadRequestException(`Unknown payment provider: ${name}`);
    }
    const provider = this.providers[name.toLowerCase()];
    if (!provider) {
      throw new BadRequestException(`Unknown payment provider: ${name}`);
    }
    return provider;
  }

  private isEnabled(name: string): boolean {
    const get = (key: string) => this.config.get<string>(key);
    switch (name) {
      case 'momo':
        return Boolean(get('MOMO_PARTNER_CODE'));
      case 'paypal':
        return Boolean(get('PAYPAL_CLIENT_ID'));
      case 'vnpay':
        return Boolean(get('PAYMENT_VNPAY_TMN_CODE'));
      case 'zalopay':
        return Boolean(get('ZALOPAY_APP_ID') && get('ZALOPAY_KEY1') && get('ZALOPAY_KEY2'));
      case 'stripe':
        return Boolean(get('STRIPE_SECRET_KEY'));
      case 'bank':
        return false;
      case 'cod':
        return true;
      // Mock providers report success without any cryptographic verification,
      // so they must never be selectable outside a local, explicitly opted-in
      // sandbox. Never enable this in production.
      case 'mock':
      case 'atm-mock':
        return (
          this.config.get<string>('ALLOW_MOCK_PAYMENT') === '1' &&
          process.env.NODE_ENV !== 'production'
        );
      default:
        return true;
    }
  }

  availableMethods(): Array<{
    provider: string;
    label: string;
    enabled: boolean;
    details?: Record<string, unknown>;
  }> {
    return Object.keys(this.providers)
      .filter((name) => name !== 'mock')
      .sort((a, b) => (PROVIDER_ORDER[a] ?? 99) - (PROVIDER_ORDER[b] ?? 99))
      .map((name) => {
        const provider = this.providers[name] as PaymentProviderInterface & {
          getDetails?: () => Record<string, unknown>;
        };
        return {
          provider: name,
          label: PROVIDER_LABELS[name] ?? name,
          enabled: this.isEnabled(name),
          details:
            typeof provider.getDetails === 'function'
              ? provider.getDetails()
              : undefined,
        };
      });
  }

  async createCheckout(
    userId: string,
    orderId: string,
    providerName: string | undefined,
    req: Request,
  ): Promise<Record<string, unknown>> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    const provider = this.resolve(providerName);
    const result = await provider.create(
      toOrderForPayment(order),
      req.ip,
      req.get('user-agent'),
    );

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.toPrismaProvider(result.provider),
        status: this.toPrismaStatus(result.status),
        amount: order.total,
        currency: 'VND',
        checkoutUrl: result.checkoutUrl,
        clientSecret: result.clientSecret,
        payload: result as any,
      },
    });

    // The order is marked PAID only by markPaid(), i.e. by a provider return/
    // IPN/webhook path whose signature was actually verified. Never trust the
    // provider's self-reported 'succeeded' status to move money.
    return {
      paymentId: payment.id,
      provider: result.provider,
      status: result.status,
      checkoutUrl: result.checkoutUrl,
      clientSecret: result.clientSecret,
      details: result.details,
      amount: Number(order.total),
      currency: 'VND',
    };
  }

  private async markPaid(
    order: { id: string; paymentId?: string; status?: string },
    transactionId?: string,
    payload?: unknown,
  ) {
    if (order.paymentId) {
      await this.prisma.payment.update({
        where: { id: order.paymentId },
        data: {
          status: PaymentStatus.SUCCEEDED,
          transactionId,
          ...(payload ? { payload: payload as any } : {}),
        },
      });
    }
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async handleVnpayReturn(userId: string, query: Record<string, string>) {
    const orderId = vnpayOrderIdFromTxnRef(query['vnp_TxnRef'] ?? '');
    if (!orderId) {
      throw new BadRequestException('Missing vnp_TxnRef');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Signature verification is mandatory. If the provider is not configured,
    // fail closed: an unverified callback must never be able to settle money.
    const provider = this.providers['vnpay'];
    if (!provider?.verify) {
      throw new BadRequestException('VNPay is not configured');
    }
    const verified = await provider.verify(query, toOrderForPayment(order));
    if (!verified) {
      throw new BadRequestException('Invalid payment signature');
    }

    const responseCode = query['vnp_ResponseCode'];
    if (responseCode === '00' && order.payment) {
      await this.markPaid(
        { id: order.id, paymentId: order.payment.id, status: order.status },
        query['vnp_TransactionNo'],
        query,
      );
    }

    return {
      orderId: order.id,
      status: 'PAID',
      responseCode,
      returnUrl: this.appUrl ? `${this.appUrl}/checkout/success?orderId=${order.id}` : null,
    };
  }

  async handleVnpayIpn(query: Record<string, string>) {
    const orderId = vnpayOrderIdFromTxnRef(query['vnp_TxnRef'] ?? '');
    if (!orderId) {
      return { RspCode: '01', Message: 'Invalid TxnRef' };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    // Signature verification is mandatory. If the provider is not configured,
    // fail closed: an unverified IPN must never be able to settle money.
    const provider = this.providers['vnpay'];
    if (!provider?.verify) {
      return { RspCode: '97', Message: 'VNPay is not configured' };
    }
    const verified = await provider.verify(query, toOrderForPayment(order));
    if (!verified) {
      return { RspCode: '97', Message: 'Invalid checksum' };
    }

    const responseCode = query['vnp_ResponseCode'];
    if (responseCode === '00' && order.payment && order.status !== 'PAID') {
      await this.markPaid(
        { id: order.id, paymentId: order.payment.id, status: order.status },
        query['vnp_TransactionNo'],
        query,
      );
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async handleMomoReturn(userId: string, query: Record<string, string>) {
    const orderId = query['orderId'];
    if (!orderId) {
      throw new BadRequestException('Missing orderId');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const provider = this.providers['momo'];
    if (!provider?.verify) {
      throw new BadRequestException('MoMo provider is not configured');
    }
    const verified = await provider.verify(query, toOrderForPayment(order));
    if (!verified) {
      throw new BadRequestException('Invalid MoMo signature');
    }

    if (query['resultCode'] === '0' && order.payment) {
      await this.markPaid(
        { id: order.id, paymentId: order.payment.id, status: order.status },
        query['transId'],
        query,
      );
    }

    return {
      orderId: order.id,
      status: order.status,
      returnUrl: this.appUrl
        ? `${this.appUrl}/checkout/success?orderId=${order.id}`
        : `/checkout/success?orderId=${order.id}`,
    };
  }

  async handlePaypalReturn(userId: string, payPalOrderId: string) {
    const provider = this.providers['paypal'];
    if (typeof provider?.capture !== 'function') {
      throw new BadRequestException(
        'Payment provider does not support PayPal return',
      );
    }

    const result = await provider.capture(payPalOrderId);
    if (!result.succeeded || !result.orderId) {
      throw new BadRequestException('Payment was not completed');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: result.orderId, userId },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.payment) {
      await this.markPaid(
        { id: order.id, paymentId: order.payment.id, status: order.status },
        result.transactionId,
      );
    }

    return {
      orderId: order.id,
      returnUrl: this.appUrl
        ? `${this.appUrl}/checkout/success?orderId=${order.id}`
        : `/checkout/success?orderId=${order.id}`,
    };
  }

  async handleZalopayCallback(
    rawBody: Buffer | undefined,
  ): Promise<{ received: boolean }> {
    const provider = this.providers['zalopay'];
    if (!(provider instanceof ZalopayPaymentProvider)) {
      return { received: false };
    }

    let body: { data?: string; mac?: string } = {};
    try {
      body = rawBody ? (JSON.parse(rawBody.toString('utf8')) as { data?: string; mac?: string }) : {};
    } catch {
      body = {};
    }

    const { valid, data } = provider.verifyCallback(body);
    if (!valid || !data) {
      return { received: false };
    }

    // status === 1 -> thanh toán thành công
    if (Number(data.status) !== 1) {
      return { received: true };
    }

    let embedData: Record<string, unknown> | null = null;
    try {
      embedData = JSON.parse(String(data.embed_data ?? '{}'));
    } catch {
      embedData = null;
    }
    const orderId =
      typeof data.orderId === 'string'
        ? data.orderId
        : typeof embedData?.orderId === 'string'
          ? embedData.orderId
          : '';
    if (!orderId) {
      return { received: true };
    }

    await this.markPaidForOrder(
      orderId,
      typeof data.zp_trans_id === 'string' ? data.zp_trans_id : undefined,
      data,
    );
    return { received: true };
  }

  async handleZalopayReturn(
    query: Record<string, string>,
  ): Promise<{ orderId: string; returnUrl: string }> {
    const provider = this.providers['zalopay'];
    if (!(provider instanceof ZalopayPaymentProvider)) {
      throw new BadRequestException('ZaloPay provider is not configured');
    }

    const appTransId = query['apptransid'] ?? query['appTransId'] ?? '';
    if (!appTransId) {
      throw new BadRequestException('Missing ZaloPay apptransid');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        payload: { path: ['details', 'appTransId'], equals: appTransId },
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // The callback proves the transaction but does not bind it to a payment
    // row. Ownership is re-established through the provider's own MAC'd
    // queryStatus call, and the order total is never taken from the request.
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Best-effort: xác nhận thanh toán qua query API nếu callback chưa về.
    const result = await provider.queryStatus(appTransId);
    if (result.succeeded && order.status !== 'PAID') {
      await this.markPaid(
        { id: order.id, paymentId: payment.id, status: order.status },
        result.transactionId,
        result.raw,
      );
    }

    return {
      orderId: order.id,
      returnUrl: this.appUrl
        ? `${this.appUrl}/checkout/success?orderId=${order.id}`
        : `/checkout/success?orderId=${order.id}`,
    };
  }

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature?: string,
  ): Promise<{ received: boolean }> {
    // Stripe webhook: the signature header is mandatory and the raw body must
    // have been captured, otherwise signature verification cannot run.
    if (signature) {
      if (!rawBody) {
        return { received: false };
      }
      const stripeProvider = this.providers['stripe'];
      if (!(stripeProvider instanceof StripePaymentProvider)) {
        return { received: false };
      }
      const event = stripeProvider.verifySignature({
        payload: rawBody,
        signature,
        endpointSecret:
          this.config.get<string>('PAYMENT_WEBHOOK_SECRET') ?? '',
      });

      if (
        event &&
        event.type === 'payment_intent.succeeded'
      ) {
        const intent = event.data.object as {
          id: string;
          metadata?: { orderId?: string };
        };
        if (intent.metadata?.orderId) {
          await this.markPaidForOrder(intent.metadata.orderId, intent.id);
        }
      }
      return { received: true };
    }

    // MoMo IPN: verified by HMAC before any business logic runs. A missing
    // signature header means this is not a Stripe event, so fall through.
    if (!rawBody) {
      return { received: false };
    }

    const text = rawBody.toString('utf8');
    let momoBody: Record<string, unknown> | null = null;
    try {
      momoBody = JSON.parse(text) as Record<string, unknown>;
    } catch {
      momoBody = null;
    }

    if (momoBody && momoBody.partnerCode && momoBody.resultCode !== undefined) {
      await this.handleMomoIpn(momoBody);
      return { received: true };
    }

    return { received: true };
  }

  private async handleMomoIpn(body: Record<string, unknown>) {
    const provider = this.providers['momo'];
    if (!(provider instanceof MomoPaymentProvider) || !provider.verifyIpn(body)) {
      return;
    }
    if (String(body.resultCode ?? '') !== '0') {
      return;
    }
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!orderId) {
      return;
    }
    await this.markPaidForOrder(orderId, typeof body.transId === 'string' ? body.transId : undefined, body);
  }

  private async markPaidForOrder(
    orderId: string,
    transactionId?: string,
    payload?: unknown,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    await this.markPaid(
      { id: orderId, paymentId: payment?.id, status: undefined },
      transactionId,
      payload,
    );
  }

  async submitAtm(userId: string, orderId: string, data: AtmSubmitDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'PAID') {
      return {
        ok: true,
        orderId: order.id,
        status: order.status,
        paymentId: order.payment?.id,
      };
    }

    // The order total is authoritative: it is read from the order row, never
    // from the client. Collecting PAN here would drag the app into PCI-DSS
    // scope, so only a transfer reference and bank name are stored.
    const toEncrypt = JSON.stringify({
      bank: data.bank,
      transRef: data.transRef,
      amount: order.total.toString(),
      timestamp: data.timestamp,
      note: data.note ?? null,
    });

    const enc = this.crypto.encrypt(toEncrypt);
    const [iv, tag] = enc.replace('enc:v1:', '').split(':');
    const encryptedData = enc;
    const authTag = tag ?? null;

    const payment = order.payment
      ? await this.prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            provider: PaymentProvider.ATM_MOCK,
            status: PaymentStatus.PENDING,
          },
        })
      : await this.prisma.payment.create({
          data: {
            orderId: order.id,
            provider: PaymentProvider.ATM_MOCK,
            status: PaymentStatus.PENDING,
            amount: order.total,
            currency: 'VND',
          },
        });

    await this.prisma.paymentMetadata.upsert({
      where: { orderId },
      create: {
        orderId,
        paymentId: payment.id,
        provider: 'atm-mock',
        encryptedData,
        iv,
        authTag,
        status: 'pending',
      },
      update: {
        paymentId: payment.id,
        provider: 'atm-mock',
        encryptedData,
        iv,
        authTag,
        status: 'pending',
        confirmedAt: null,
        confirmedBy: null,
        note: null,
      },
    });

    return { ok: true, orderId, paymentId: payment.id, status: 'pending' };
  }

  async confirmAtm(paymentId: string, confirmedBy: string, note?: string) {
    const meta = await this.prisma.paymentMetadata.findFirst({
      where: { paymentId },
    });
    if (!meta) throw new NotFoundException('Payment metadata not found');
    if (meta.status === 'confirmed') {
      return { ok: true, alreadyConfirmed: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMetadata.update({
        where: { id: meta.id },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy,
          note: note ?? null,
        },
      });
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });
      if (payment?.orderId && payment.order) {
        // The transfer amount recorded at submit time is compared against the
        // authoritative order total. A mismatch means the customer did not
        // transfer the full amount, so the order must not be settled.
        const submitted = this.decodeAtmPayload(meta.encryptedData);
        const submittedAmount = Number(
          (submitted as { amount?: unknown } | null)?.amount ?? NaN,
        );
        if (
          !Number.isFinite(submittedAmount) ||
          submittedAmount !== Number(payment.order.total)
        ) {
          throw new BadRequestException(
            'Transferred amount does not match the order total',
          );
        }
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'PAID', paidAt: new Date() },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCEEDED },
        });
      }
    });

    return { ok: true, status: 'confirmed' };
  }

  async listAtmSubmissions(status?: string) {
    const normalized = status && status !== 'all' ? status : undefined;
    const rows = await this.prisma.paymentMetadata.findMany({
      where: normalized ? { status: normalized } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    if (rows.length === 0) return [];

    const paymentIds = [...new Set(rows.map((row) => row.paymentId))];
    const payments = await this.prisma.payment.findMany({
      where: { id: { in: paymentIds } },
      include: { order: true },
    });
    const byId = new Map(payments.map((payment) => [payment.id, payment]));

    return rows.map((meta) => {
      const order = byId.get(meta.paymentId)?.order;
      const submitted = this.decodeAtmPayload(meta.encryptedData) as {
        amount?: unknown;
        bank?: string;
        transRef?: string;
        timestamp?: string;
        note?: unknown;
      } | null;
      const submittedAmount = Number(submitted?.amount ?? NaN);
      const orderTotal = order ? Number(order.total) : NaN;
      return {
        id: meta.id,
        orderId: meta.orderId,
        paymentId: meta.paymentId,
        provider: meta.provider,
        status: meta.status,
        createdAt: meta.createdAt,
        confirmedAt: meta.confirmedAt,
        confirmedBy: meta.confirmedBy,
        note: meta.note,
        // Surfacing both figures lets staff see the match before confirming.
        submitted: submitted ? { ...submitted, amount: submittedAmount } : null,
        amountMatchesOrder:
          Number.isFinite(submittedAmount) &&
          Number.isFinite(orderTotal) &&
          submittedAmount === orderTotal,
        order: order
          ? {
              id: order.id,
              status: order.status,
              total: orderTotal,
              receiverName: this.safeDecrypt(order.receiverName),
              receiverPhone: this.safeDecrypt(order.receiverPhone),
            }
          : null,
      };
    });
  }

  private decodeAtmPayload(encryptedData: string): unknown {
    let json: string | null | undefined = null;
    try {
      json = this.crypto.decrypt(encryptedData);
    } catch {
      // A tampered or wrong-key row must not break the staff listing.
      return null;
    }
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private safeDecrypt(value: string | null): string | null {
    try {
      return this.crypto.decrypt(value) ?? null;
    } catch {
      return null;
    }
  }

  private toPrismaProvider(name: string): PaymentProvider {
    const upper = name.toUpperCase();
    return upper in PaymentProvider
      ? (upper as keyof typeof PaymentProvider) as PaymentProvider
      : PaymentProvider.MOCK;
  }

  private toPrismaStatus(
    status: 'pending' | 'succeeded' | 'failed',
  ): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return PaymentStatus.SUCCEEDED;
      case 'failed':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}