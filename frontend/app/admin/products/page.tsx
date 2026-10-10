import Link from 'next/link';
import AdminProductsClient from './products-client';
import { getSessionServer } from '@/lib/server-api';

/**
 * Server-side role check before the management bundle is shipped. The API
 * enforces the same rule (RolesGuard on /products/admin and the write routes),
 * so the client check is purely a UX barrier.
 */
export default async function AdminProductsPage() {
  const session = await getSessionServer();
  const allowed = session?.role === 'ADMIN' || session?.role === 'STAFF';

  if (!allowed) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Không có quyền truy cập
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Trang này chỉ dành cho nhân viên (STAFF) hoặc quản trị viên (ADMIN).
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return <AdminProductsClient />;
}
