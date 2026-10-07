import { NextResponse, type NextRequest } from 'next/server';

const API_TARGET = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:3001';

const CSP =
  process.env.NODE_ENV === 'production'
    ? "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev; font-src 'self'"
    : "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https: data: http://localhost:9000 http://127.0.0.1:9000; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 ws://localhost:3000 ws://127.0.0.1:3000";

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

  const res = NextResponse.next();
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.headers.set('Content-Security-Policy', CSP);
  }
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

  const out = new NextResponse(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: resp.headers,
  });
  out.headers.delete('content-encoding');
  out.headers.delete('transfer-encoding');
  out.headers.delete('content-length');
  return out;
}

export const config = {
  matcher: ['/((?!_next/|images/|favicon.ico).*)'],
};
