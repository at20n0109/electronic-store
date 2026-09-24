import type { IncomingHttpHeaders } from 'node:http';
import type { Request } from 'express';

export interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderForPayment {
  id: string;
  userId: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  items: OrderLineItem[];
}

export type CheckoutResultStatus = 'pending' | 'succeeded' | 'failed';

export interface CheckoutResult {
  provider: string;
  status: CheckoutResultStatus;
  amount: number;
  currency: string;
  checkoutUrl?: string;
  clientSecret?: string;
}

export interface PaymentProvider {
  readonly name: string;
  create(
    order: OrderForPayment,
    ip?: string,
    userAgent?: string,
  ): Promise<CheckoutResult>;
  verify?(
    params: Record<string, string>,
    order: OrderForPayment,
  ): Promise<boolean>;
}

export function ipFromRequest(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (typeof first === 'string' && first ? first.split(',')[0].trim() : '') || req.socket.remoteAddress || '';
}

export function userAgentFromRequest(req: Request): string {
  const headers = req.headers as IncomingHttpHeaders;
  return typeof headers['user-agent'] === 'string' ? (headers['user-agent'] as string) : '';
}
