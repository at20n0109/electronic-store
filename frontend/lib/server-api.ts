import { cookies } from 'next/headers';
import type { Invoice, Order } from './types';

export const serverApiUrl =
  process.env.BACKEND_URL ??
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:3001';

/**
 * Server-side fetch that forwards the request cookies so the browser session
 * authenticates the call. The raw upstream error body is never surfaced; the
 * caller only learns that the request failed.
 */
export async function serverFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const csrf = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('csrf_token='));
  const csrfValue = csrf
    ? decodeURIComponent(csrf.slice('csrf_token='.length))
    : null;

  const res = await fetch(`${serverApiUrl}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(csrfValue && init?.method && init.method !== 'GET'
        ? { 'x-csrf-token': csrfValue }
        : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) return null;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getSessionServer() {
  return serverFetch<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  }>('/api/v1/auth/me');
}

export function getInvoiceServer(orderId: string) {
  return serverFetch<Invoice>(`/api/v1/invoices/orders/${orderId}`);
}

export function getOrderServer(orderId: string) {
  return serverFetch<Order>(`/api/v1/orders/${orderId}`);
}
