import Stripe from 'stripe';
import type { CheckoutResult, OrderForPayment, PaymentProvider } from '../types.js';

export interface StripeVerify {
  payload: string | Buffer;
  signature: string | undefined;
  endpointSecret: string;
}export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly stripe: Stripe;

  constructor(configGetter: (key: string) => string | undefined) {
    const secretKey = configGetter('STRIPE_SECRET_KEY') ?? '';
    this.stripe = new Stripe(secretKey);
  }

  async create(
    order: OrderForPayment,
  ): Promise<CheckoutResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: (order.currency ?? 'vnd').toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        userId: order.userId,
      },
    });

    return {
      provider: this.name,
      status: intent.status === 'succeeded' ? 'succeeded' : 'pending',
      amount: order.total,
      currency: order.currency ?? 'VND',
      clientSecret: intent.client_secret ?? undefined,
    };
  }

  verifySignature(input: StripeVerify): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      input.payload,
      input.signature ?? '',
      input.endpointSecret,
    );
  }
}
