import type {
  AdminOrder,
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

/**
 * The access token is deliberately never persisted in localStorage or any
 * other JavaScript-readable store. It lives only in the HttpOnly cookie set by
 * the API, so an XSS payload cannot read it. Every request is credentialed,
 * which is what actually authenticates the browser session.
 */
function csrfHeaders(): HeadersInit | undefined {
  if (typeof document === 'undefined') return undefined;
  // base64url never contains '=', but a value that does must survive the split.
  const raw = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('csrf_token='));
  if (!raw) return undefined;
  const value = raw.slice('csrf_token='.length);
  if (!value) return undefined;
  try {
    return { 'x-csrf-token': decodeURIComponent(value) };
  } catch {
    return undefined;
  }
}

const AUTH_EVENT = 'pcstore:auth';

function dispatchAuthEvent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

let refreshInFlight: Promise<boolean> | null = null;

function tryRefreshAuth(): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
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
        dispatchAuthEvent();
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
  dispatchAuthEvent();
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

/**
 * Only validation messages are safe to show verbatim. Anything else is
 * collapsed to a generic string so backend internals (paths, Prisma text,
 * error codes) never reach the UI.
 */
const SAFE_STATUS_MESSAGES: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu bạn yêu cầu.',
  409: 'Dữ liệu đã tồn tại hoặc xung đột với trạng thái hiện tại.',
  422: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
};

function extractErrorMessage(status: number, body: string): string {
  // ValidationPipe emits string[] in `message`. Only those are forwarded.
  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: unknown };
      const m = parsed?.message;
      if (Array.isArray(m)) {
        const lines = m.filter((entry): entry is string => typeof entry === 'string');
        if (lines.length > 0) return lines.join('\n');
      }
    } catch {
      // not JSON — fall through to the generic message
    }
  }
  return SAFE_STATUS_MESSAGES[status] ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.';
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
      ...init?.headers,
    },
  });

  if (res.status === 401 && !retriedAfterRefresh && (await tryRefreshAuth())) {
    return apiFetch<T>(path, init, true);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, extractErrorMessage(res.status, body), path);
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

/** External hosts the app is allowed to hand the browser to. */
const ALLOWED_REDIRECT_HOSTS = new Set([
  'accounts.google.com',
  'www.facebook.com',
  'appleid.apple.com',
  'www.sandbox.paypal.com',
  'www.paypal.com',
  'sandbox.vnpayment.vn',
  'vnpayment.vn',
  'sbgateway.zalopay.vn',
  'zalopay.vn',
  'checkout.stripe.com',
]);

/**
 * Navigates the browser to a target returned by the API.
 *
 * Relative URLs must stay same-origin. Absolute URLs are only allowed when
 * their host is in the allowlist above, so a compromised or spoofed response
 * cannot bounce a logged-in user to an arbitrary phishing domain.
 */
export function safeNavigate(target: string): boolean {
  if (typeof window === 'undefined') return false;
  let parsed: URL;
  try {
    parsed = new URL(target, window.location.origin);
  } catch {
    return false;
  }
  if (parsed.origin === window.location.origin) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a validated same-origin target is used to force a clean document load after a payment callback
    window.location.href = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return true;
  }
  if (parsed.protocol === 'https:' && ALLOWED_REDIRECT_HOSTS.has(parsed.hostname)) {
    window.location.href = parsed.toString();
    return true;
  }
  return false;
}

export async function register(fields: RegisterFields): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fields),
  });
  dispatchAuthEvent();
  return result;
}

export async function login(fields: LoginFields): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fields),
  });
  dispatchAuthEvent();
  return result;
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
  const result = await apiFetch<AuthResult>('/api/v1/auth/phone/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
  dispatchAuthEvent();
  return result;
}

export async function startSocialLogin(
  provider: 'google' | 'facebook' | 'apple',
): Promise<void> {
  const { url } = await apiFetch<{ url: string }>(
    `/api/v1/auth/social/${provider}`,
  );
  safeNavigate(url);
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

/**
 * Mirrors the server-side AtmSubmitDto exactly. The transferred amount is
 * deliberately not a field: the order total is the server's to decide, and a
 * client-supplied amount would put an editable price into the settlement path.
 */
export interface AtmSubmitFields {
  bank: string;
  transRef: string;
  timestamp: string;
  note?: string;
}

export async function submitAtm(
  orderId: string,
  fields: AtmSubmitFields,
): Promise<{ ok: boolean; orderId: string; paymentId: string; status: string }> {
  return apiFetch<{ ok: boolean; orderId: string; paymentId: string; status: string }>(
    `/api/v1/payments/${encodeURIComponent(orderId)}/atm-submit`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fields),
    },
  );
}

export interface AtmSubmission {
  id: string;
  orderId: string;
  paymentId: string;
  provider: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  note: string | null;
  submitted: {
    bank?: string;
    transRef?: string;
    amount?: number;
    timestamp?: string;
    note?: string | null;
  } | null;
  /** True when the recorded transfer amount equals the order total. */
  amountMatchesOrder?: boolean;
  order: {
    id: string;
    status: string;
    total: number;
    receiverName: string | null;
    receiverPhone: string | null;
  } | null;
}

export async function getAtmSubmissions(
  status = 'pending',
): Promise<AtmSubmission[]> {
  return apiFetch<AtmSubmission[]>(
    `/api/v1/payments/atm/submissions?status=${encodeURIComponent(status)}`,
  );
}

export async function confirmAtm(
  paymentId: string,
  note?: string,
): Promise<{ ok: boolean; status: string; alreadyConfirmed?: boolean }> {
  return apiFetch<{ ok: boolean; status: string; alreadyConfirmed?: boolean }>(
    `/api/v1/payments/${encodeURIComponent(paymentId)}/atm-confirm`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note }),
    },
  );
}

export async function getMyOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/api/v1/orders');
}

export async function getOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/v1/orders/${orderId}`);
}

export async function getAdminOrders(
  status?: 'PENDING' | 'PAID' | 'CANCELLED',
): Promise<AdminOrder[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<AdminOrder[]>(`/api/v1/orders/admin${query}`, {
    cache: 'no-store',
  });
}

export async function getAdminProducts(
  params: URLSearchParams,
): Promise<PaginatedResponse<Product>> {
  const qs = params.toString();
  return apiFetch<PaginatedResponse<Product>>(
    `/api/v1/products/admin${qs ? `?${qs}` : ''}`,
    { cache: 'no-store' },
  );
}

export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: string | null;
  images?: { url: string; alt?: string }[];
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return apiFetch<Product>('/api/v1/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<Product> {
  return apiFetch<Product>(`/api/v1/products/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/v1/products/${id}`, {
    method: 'DELETE',
  });
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
        headers: { ...csrfHeaders() },
      },
    );
    if (res.ok) return res.blob();
    if (res.status === 401 && !retried && (await tryRefreshAuth())) {
      retried = true;
      continue;
    }
    if (res.status === 403) {
      throw new ApiError(403, 'Bạn không có quyền xem hóa đơn này.');
    }
    if (res.status === 404) {
      throw new ApiError(404, 'Không tìm thấy hóa đơn.');
    }
    throw new ApiError(res.status, extractErrorMessage(res.status, await res.text().catch(() => '')));
  }
  throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
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
