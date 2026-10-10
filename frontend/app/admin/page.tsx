import Link from 'next/link';
import { getSessionServer } from '@/lib/server-api';

const SECTIONS = [
  {
    href: '/admin/orders',
    title: 'Quản lý đơn hàng',
    description:
      'Xem đơn đã thanh toán thành công và đơn đang chờ thanh toán, kèm chi tiết khách hàng và sản phẩm.',
  },
  {
    href: '/admin/products',
    title: 'Quản lý sản phẩm',
    description: 'Thêm, sửa, xoá sản phẩm trong danh mục của cửa hàng.',
  },
  {
    href: '/admin/atm',
    title: 'Duyệt giao dịch ATM',
    description:
      'Kiểm tra thông tin khách chuyển khoản ATM/Internet Banking và xác nhận thanh toán.',
  },
] as const;

export default async function AdminHomePage() {
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Khu vực quản trị
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Xin chào {session?.name || session?.email}. Chọn chức năng bên dưới.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-red-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
            <span className="mt-4 text-sm font-semibold text-red-600">
              Mở →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
