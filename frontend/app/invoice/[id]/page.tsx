import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getInvoiceServer, getOrderServer } from '@/lib/server-api';
import { formatVND } from '@/lib/api';
import type { Invoice, Order } from '@/lib/types';

interface Resolved {
  order: Order;
  invoice: Invoice;
}

async function resolveInvoice(orderId: string): Promise<Resolved | null> {
  try {
    const [order, invoice] = await Promise.all([
      getOrderServer(orderId),
      getInvoiceServer(orderId),
    ]);
    return { order, invoice };
  } catch {
    return null;
  }
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolved = await resolveInvoice(id);

  if (!resolved) {
    notFound();
  }

  const { order, invoice } = resolved;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Hoá đơn #{invoice.number}
        </h1>
        {invoice.id && (
          <a
            href={`/api/v1/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-red-600 underline"
          >
            Tải PDF
          </a>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Đơn hàng
            </h2>
            <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between py-2 text-zinc-700 dark:text-zinc-300"
                >
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatVND(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Tạm tính</span>
                <span>{formatVND(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Phí vận chuyển</span>
                <span>{formatVND(order.shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Tổng cộng</span>
                <span>{formatVND(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Người nhận
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {order.receiverName} - {order.receiverPhone}
            </p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {order.receiverAddress}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Trạng thái: {order.status} / Thanh toán:{' '}
              {order.payment?.status ?? 'n/a'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          {invoice.qrDataUrl && (
            <Image
              src={invoice.qrDataUrl}
              alt="Mã QR xác minh hoá đơn"
              width={180}
              height={180}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800"
            />
          )}
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Quét mã để xác minh hoá đơn trên thiết bị di động.
          </p>
          <p className="text-center text-xs text-zinc-500">
            Phát hành: {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>
    </div>
  );
}
