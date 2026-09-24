import { NextResponse, type NextRequest } from 'next/server';

const API_TARGET = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:3001';

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!pathname.startsWith('/api/v1')) {
    return NextResponse.next();
  }

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
  matcher: ['/api/v1/:path*'],
};
