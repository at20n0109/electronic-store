import type {
  AuthMethods,
  AuthResult,
  Cart,
  Category,
  Invoice,
  LoginFields,
  Order,
  PaginatedResponse,
  PcBuild,
  PcBuildDetail,
  Product,
  RegisterFields,
  SessionUser,
} from './types';

export const API_URL =
  typeof window === 'undefined'
    ? (process.env.BACKEND_URL ??
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      'http://127.0.0.1:3001')
    : (process.env.NEXT_PUBLIC_API_URL ?? '');

const TOKEN_KEY = 'pcstore_access_token';

function csrfHeaders(): HeadersInit | undefined {
  if (typeof document === 'undefined') return undefined;
  const token = document.cookie
    .split('; ')
    .find((value) => value.startsWith('csrf_token='))
    ?.split('=')[1];
  return token ? { 'x-csrf-token': decodeURIComponent(token) } : undefined;
}

function bearerHeaders(): HeadersInit | undefined {
  if (typeof window === 'undefined') return undefined;
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

const AUTH_EVENT = 'pcstore:auth';

function dispatchAuthEvent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

function storeAuth<T extends AuthResult>(result: T): T {
  if (typeof window !== 'undefined' && result.accessToken) {
    window.localStorage.setItem(TOKEN_KEY, result.accessToken);
    dispatchAuthEvent();
  }
  return result;
}

let refreshInFlight: Promise<boolean> | null = null;

function tryRefreshAuth(): Promise<boolean> {
  if (typeof document === 'undefined' || !document.cookie.includes('csrf_token=')) {
    return Promise.resolve(false);
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { ...csrfHeaders(), 'content-type': 'application/json' },
          body: '{}',
        });
        if (!res.ok) return false;
        storeAuth((await res.json()) as AuthResult);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export function clearStoredAuth(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
    dispatchAuthEvent();
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function extractErrorMessage(status: number, path: string, body: string): string {
  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: unknown };
      const m = parsed?.message;
      const text =
        typeof m === 'string'
          ? m
          : m && typeof m === 'object' && typeof (m as { message?: unknown }).message === 'string'
            ? ((m as { message: string }).message)
            : null;
      if (text) return text;
    } catch {
      // not JSON — fall through
    }
  }
  return `API request failed: ${status} ${path}`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  retriedAfterRefresh = false,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
    headers: {
      ...csrfHeaders(),
      ...bearerHeaders(),
      ...init?.headers,
    },
  });

  if (res.status === 401 && !retriedAfterRefresh && (await tryRefreshAuth())) {
    return apiFetch<T>(path, init, true);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, extractErrorMessage(res.status, path, body), path);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getProducts(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<Product>>(`/api/v1/products?${params.toString()}`);
}

export async function getProductBySlug(slug: string) {
  return apiFetch<Product>(`/api/v1/products/slug/${encodeURIComponent(slug)}`);
}

export async function getCategories() {
  return apiFetch<Category[]>('/api/v1/categories');
}

export async function getPcBuilds() {
  return apiFetch<PcBuild[]>('/api/v1/pc-builds');
}

export async function getPcBuild(slug: string) {
  return apiFetch<PcBuildDetail>(
    `/api/v1/pc-builds/${encodeURIComponent(slug)}`,
  );
}

export async function register(fields: RegisterFields): Promise<AuthResult> {
  return storeAuth(
    await apiFetch<AuthResult>('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fields),
    }),
  );
}

export async function login(fields: LoginFields): Promise<AuthResult> {
  return storeAuth(
    await apiFetch<AuthResult>('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fields),
    }),
  );
}

export async function getAuthMethods(): Promise<AuthMethods> {
  return apiFetch<AuthMethods>('/api/v1/auth/methods');
}

export async function sendOtp(
  phone: string,
): Promise<{ ok: true; debugCode?: string }> {
  return apiFetch<{ ok: true; debugCode?: string }>(
    '/api/v1/auth/phone/send-otp',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone }),
    },
  );
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<AuthResult> {
  return storeAuth(
    await apiFetch<AuthResult>('/api/v1/auth/phone/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    }),
  );
}

export async function startSocialLogin(
  provider: 'google' | 'facebook' | 'apple',
): Promise<void> {
  const { url } = await apiFetch<{ url: string }>(
    `/api/v1/auth/social/${provider}`,
  );
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

export async function logout(): Promise<void> {
  clearStoredAuth();
  await apiFetch<void>('/api/v1/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>('/api/v1/auth/me');
}

export async function getCart() {
  return apiFetch<Cart>('/api/v1/cart');
}

export async function addToCart(
  productId: string,
  quantity = 1,
): Promise<Cart> {
  return apiFetch<Cart>('/api/v1/cart/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function addToCartBulk(
  items: { productId: string; quantity?: number }[],
): Promise<Cart> {
  return apiFetch<Cart>('/api/v1/cart/items/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<Cart> {
  return apiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  return apiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function clearCart(): Promise<Cart> {
  return apiFetch<Cart>('/api/v1/cart', { method: 'DELETE' });
}

export interface CreateOrderFields {
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note?: string;
}

export async function createOrder(fields: CreateOrderFields): Promise<Order> {
  return apiFetch<Order>('/api/v1/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

export async function checkout(
  orderId: string,
  provider?: string,
): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/api/v1/payments/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId, ...(provider ? { provider } : {}) }),
  });
}

export interface PaymentMethod {
  provider: string;
  label: string;
  enabled: boolean;
  details?: Record<string, unknown>;
}

export interface VnpayReturnResult {
  orderId: string;
  status: string;
  responseCode: string;
  returnUrl: string | null;
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return apiFetch<PaymentMethod[]>('/api/v1/payments/methods');
}

export async function getVnpayReturn(
  params: Record<string, string>,
): Promise<VnpayReturnResult> {
  const query = new URLSearchParams(params).toString();
  return apiFetch<VnpayReturnResult>(`/api/v1/payments/return?${query}`, {
    cache: 'no-store',
  });
}

export async function getMyOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/api/v1/orders');
}

export async function getOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/v1/orders/${orderId}`);
}

export async function getInvoice(orderId: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/api/v1/invoices/orders/${orderId}`);
}

export async function getInvoicePdf(invoiceId: string): Promise<Blob> {
  let retried = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(
      `${API_URL}/api/v1/invoices/${encodeURIComponent(invoiceId)}/pdf`,
      {
        credentials: 'include',
        headers: { ...bearerHeaders() },
      },
    );
    if (res.ok) return res.blob();
    if (res.status === 401 && !retried && (await tryRefreshAuth())) {
      retried = true;
      continue;
    }
    throw new ApiError(res.status, `Không tải được PDF (HTTP ${res.status})`);
  }
  throw new ApiError(401, 'Không tải được PDF');
}

export function getImageUrl(
  base: string,
  width?: number,
  height?: number,
): string {
  const url = new URL(base);
  if (width) url.searchParams.set('w', String(width));
  if (height) url.searchParams.set('h', String(height));
  return url.toString();
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export type ProductQuery = {
  search?: string;
  category?: string;
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'newest';
  page?: number;
  minPrice?: number;
  maxPrice?: number;
};

export function buildProductQuery(query: ProductQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  if (query.sort) params.set('sort', query.sort);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.minPrice !== undefined) {
    params.set('minPrice', String(query.minPrice));
  }
  if (query.maxPrice !== undefined) {
    params.set('maxPrice', String(query.maxPrice));
  }
  return params;
}
