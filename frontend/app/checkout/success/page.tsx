import Link from 'next/link';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const orderId = typeof params.orderId === 'string' ? params.orderId : '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600 dark:bg-green-900/40 dark:text-green-400">
        ✓
      </div>
      <h1 className="font-heading mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Thanh toán thành công
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Cảm ơn bạn đã đặt hàng. Hoá đơn đã được ghi nhận và đơn hàng đang
        được xử lý.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {orderId && (
          <Link
            href={`/invoice/${orderId}`}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-500 sm:w-auto"
          >
            Xem hoá đơn & PDF
          </Link>
        )}
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-zinc-300 px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900 sm:w-auto"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
}