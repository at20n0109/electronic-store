import Link from 'next/link';
import AdminAtmClient from './atm-client';
import { getSessionServer } from '@/lib/server-api';

/**
 * The role check runs on the server, before any client component ships. This
 * is a UX barrier as well: unauthenticated visitors get a plain "denied" page
 * instead of a bundle that calls the staff endpoint and then reveals it. The
 * API enforces the same rule (RolesGuard on GET /payments/atm/submissions),
 * so a flipped client check cannot expose anything either way.
 */
export default async function AdminAtmPage() {
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

  return <AdminAtmClient />;
}
