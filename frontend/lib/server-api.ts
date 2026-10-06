import { cookies } from 'next/headers';
import type { Invoice, Order } from './types';

export const serverApiUrl =
  process.env.BACKEND_URL ??
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:3001';

export async function serverFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();
  const res = await fetch(`${serverApiUrl}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      cookie: cookieStore.toString(),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API request failed: ${res.status} ${path}${detail ? ` - ${detail}` : ''}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getInvoiceServer(orderId: string) {
  return serverFetch<Invoice>(`/api/v1/invoices/orders/${orderId}`);
}

export function getOrderServer(orderId: string) {
  return serverFetch<Order>(`/api/v1/orders/${orderId}`);
}
