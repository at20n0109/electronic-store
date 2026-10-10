import { NextResponse, type NextRequest } from 'next/server';

const API_TARGET =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:3001';

const isDev = process.env.NODE_ENV === 'development';

/**
 * A per-request nonce removes `script-src 'unsafe-inline'`, which would
 * otherwise nullify CSP as an XSS mitigation. `strict-dynamic` lets the nonced
 * Next.js runtime load the scripts it needs without allowlisting hosts.
 */
function buildCsp(nonce: string): string {
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  return [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob: https: http://localhost:9000 http://127.0.0.1:9000 http://localhost:3001 http://127.0.0.1:3001",
    "font-src 'self' data:",
    "connect-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev http://localhost:3001 http://127.0.0.1:3001",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev
      ? []
      : ['upgrade-insecure-requests']),
  ].join('; ');
}

/** Upstream headers that are safe to pass through to the browser. */
const ALLOWED_RESPONSE_HEADERS = new Set([
  'content-type',
  'cache-control',
  'vary',
  'x-request-id',
]);

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith('/__nextjs')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (pathname.startsWith('/api/v1')) {
    if (process.env.NEXT_PUBLIC_DISABLE_PROXY !== 'true') {
      return proxyApi(req, pathname, search);
    }
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // The nonce is forwarded to the page render as a request header so any
  // inline style/script the framework emits can carry it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Applied on every method, not just GET/HEAD: HTML and API-ish responses to
  // other verbs must carry the same protections.
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

async function proxyApi(req: NextRequest, pathname: string, search: string) {
  const url = new URL(`${API_TARGET}${pathname}${search}`);

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.set('x-forwarded-proto', req.nextUrl.protocol.slice(0, -1));

  const method = req.method;
  const hasBody = !['GET', 'HEAD'].includes(method);

  const fetchOptions: RequestInit = {
    method,
    headers,
    // Upstream redirects are followed server-side and re-validated below, so a
    // provider's Location header cannot be passed straight to the browser.
    redirect: 'manual',
    cache: 'no-store',
  };

  if (hasBody) {
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      fetchOptions.body = formData;
    } else {
      const bodyText = await req.text();
      if (bodyText) {
        headers.set('content-type', contentType || 'application/json');
        fetchOptions.body = bodyText;
      }
    }
  }

  const resp = await fetch(url, fetchOptions);

  const location = resp.headers.get('location');
  if (location && resp.status >= 300 && resp.status < 400) {
    // Only same-origin locations are forwarded. Anything else is turned into a
    // plain JSON response so an upstream redirect cannot send a logged-in user
    // to an arbitrary external domain.
    const target = new URL(location, url.origin);
    if (target.origin !== url.origin) {
      return NextResponse.json(
        { message: 'Redirect target rejected' },
        { status: 502 },
      );
    }
    const redirect = NextResponse.redirect(target, resp.status);
    redirect.headers.set(
      'Content-Security-Policy',
      buildCsp(Buffer.from(crypto.randomUUID()).toString('base64')),
    );
    return redirect;
  }

  // Only an allowlist of upstream headers is forwarded. Copying everything
  // would inherit any Set-Cookie / Access-Control-* / Cache-Control the backend
  // sets onto this origin.
  const outHeaders = new Headers();
  resp.headers.forEach((value, key) => {
    if (ALLOWED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      outHeaders.set(key, value);
    }
  });

  const out = new NextResponse(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: outHeaders,
  });
  out.headers.set(
    'Content-Security-Policy',
    buildCsp(Buffer.from(crypto.randomUUID()).toString('base64')),
  );
  return out;
}

export const config = {
  matcher: ['/((?!_next/|images/|favicon.ico).*)'],
};
