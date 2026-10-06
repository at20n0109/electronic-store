import type {
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
} from './types';

export const API_URL =
  typeof window === 'undefined'
    ? (process.env.BACKEND_URL ??
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      'http://127.0.0.1:3001')
    : (process.env.NEXT_PUBLIC_API_URL ?? '');

function csrfHeaders(): HeadersInit | undefined {
  if (typeof document === 'undefined') return undefined;
  const token = document.cookie
    .split('; ')
    .find((value) => value.startsWith('csrf_token='))
    ?.split('=')[1];
  return token ? { 'x-csrf-token': decodeURIComponent(token) } : undefined;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
    headers: {
      ...csrfHeaders(),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API request failed: ${res.status} ${path}${detail ? ` - ${detail}` : ''}`);
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
  return apiFetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

export async function login(fields: LoginFields): Promise<AuthResult> {
  return apiFetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/api/v1/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return apiFetch<{ id: string; email: string; name: string | null; role: string }>(
    '/api/v1/auth/me',
  );
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
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return apiFetch<PaymentMethod[]>('/api/v1/payments/methods');
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
