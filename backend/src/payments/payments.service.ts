import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PaymentProvider, PaymentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MockPaymentProvider } from './providers/mock.provider.js';
import { PaypalPaymentProvider } from './providers/paypal.provider.js';
import { StripePaymentProvider } from './providers/stripe.provider.js';
import { VnpayPaymentProvider } from './providers/vnpay.provider.js';
import type {
  OrderForPayment,
  OrderLineItem,
  PaymentProvider as PaymentProviderInterface,
} from './types.js';

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
  private readonly provider: PaymentProviderInterface;
  private readonly appUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.provider = this.buildProvider();
    this.appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? '';
  }

  private buildProvider(): PaymentProviderInterface {
    const chosen =
      (this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock').toLowerCase();
    const get = (key: string) => this.config.get<string>(key);

    switch (chosen) {
      case 'paypal':
        return new PaypalPaymentProvider(get);
      case 'stripe':
        return new StripePaymentProvider(get);
      case 'vnpay':
        return new VnpayPaymentProvider(get);
      default:
        return new MockPaymentProvider();
    }
  }

  async createCheckout(
    userId: string,
    orderId: string,
    req: Request,
  ): Promise<Record<string, unknown>> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    const result = await this.provider.create(
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
      amount: Number(order.total),
      currency: 'VND',
    };
  }

  async handleVnpayReturn(userId: string, query: Record<string, string>) {
    const orderId = query['vnp_TxnRef'];
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
      typeof this.provider.verify === 'function'
        ? this.provider.verify(query, toOrderForPayment(order))
        : true;

    if (!verified) {
      throw new BadRequestException('Invalid payment signature');
    }

    const responseCode = query['vnp_ResponseCode'];
    if (responseCode === '00' && order.payment) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          transactionId: query['vnp_TransactionNo'],
          payload: query as any,
        },
      });
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

    return {
      orderId: order.id,
      status: order.status,
      responseCode,
      returnUrl: this.appUrl ? `${this.appUrl}/checkout/success?orderId=${order.id}` : null,
    };
  }

  async handlePaypalReturn(userId: string, payPalOrderId: string) {
    if (typeof this.provider.capture !== 'function') {
      throw new BadRequestException(
        'Payment provider does not support PayPal return',
      );
    }

    const result = await this.provider.capture(payPalOrderId);
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
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          transactionId: result.transactionId,
        },
      });
    }
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

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

    if (this.provider instanceof StripePaymentProvider && signature) {
      const event = this.provider.verifySignature({
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
          await this.prisma.payment.updateMany({
            where: { orderId: intent.metadata.orderId },
            data: {
              status: PaymentStatus.SUCCEEDED,
              transactionId: intent.id,
            },
          });
          await this.prisma.order.updateMany({
            where: { id: intent.metadata.orderId },
            data: { status: 'PAID', paidAt: new Date() },
          });
        }
      }
    }

    return { received: true };
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
