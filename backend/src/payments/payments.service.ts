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
      mock: new MockPaymentProvider(),
      bank: new BankTransferProvider(get),
      cod: new CodPaymentProvider(),
      'atm-mock': new AtmMockProvider(),
    };
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
    return this.providers[chosen] ?? this.providers['mock'];
  }

  private resolve(name: string | undefined): PaymentProviderInterface {
    if (!name) {
      return this.defaultProvider();
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
        return true;
      case 'cod':
        return true;
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

    // Providers that complete immediately (e.g. mock) mark the order paid
    // right away so the invoice reflects the final state without a webhook.
    if (payment.status === PaymentStatus.SUCCEEDED && order.status !== 'PAID') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

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

    const verified =
      typeof this.providers['vnpay']?.verify === 'function'
        ? await this.providers['vnpay'].verify!(query, toOrderForPayment(order))
        : true;

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

    const verified =
      typeof this.providers['vnpay']?.verify === 'function'
        ? await this.providers['vnpay'].verify!(query, toOrderForPayment(order))
        : true;

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

    const stripeProvider = this.providers['stripe'];
    if (stripeProvider instanceof StripePaymentProvider && signature) {
      const event = stripeProvider.verifySignature({
        payload: rawBody,
        signature: signature ?? '',
        endpointSecret: this.config.get<string>('PAYMENT_WEBHOOK_SECRET') ?? '',
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

    const toEncrypt = JSON.stringify({
      bank: data.bank,
      cardNumber: data.cardNumber,
      transRef: data.transRef,
      amount: data.amount,
      timestamp: data.timestamp,
      note: data.note ?? null,
    });

    const enc = this.crypto.encrypt(toEncrypt);
    const [prefix, iv, tag, ct] = enc.split(':');
    const encryptedData = [prefix, iv, ct].join(':');
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
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (payment?.orderId) {
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