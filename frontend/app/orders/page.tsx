'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, formatVND, getMyOrders } from '@/lib/api';
import type { Order } from '@/lib/types';
import { Package, Spinner } from '@phosphor-icons/react';

type PageState = 'loading' | 'ready' | 'denied' | 'error';

const ORDER_STATUS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

function statusClass(status: string): string {
  if (status === 'PAID') {
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
  }
  if (status === 'CANCELLED') {
    return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function MyOrdersPage() {
  const [state, setState] = useState<PageState>('loading');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getMyOrders();
        if (!active) return;
        setOrders(list);
        setState('ready');
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setState('denied');
        } else {
          setState('error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-24 text-zinc-500">
        <Spinner size={32} className="animate-spin" />
        <p className="text-sm">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-heading text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Cần đăng nhập
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Vui lòng đăng nhập để xem đơn hàng của bạn.
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

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-heading text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Không tải được đơn hàng
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Vui lòng thử lại sau.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Đơn hàng của tôi
      </h1>

      {orders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white py-16 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <Package size={40} weight="bold" />
          <p className="text-sm">Bạn chưa có đơn hàng nào.</p>
          <Link
            href="/"
            className="mt-2 inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}
                  >
                    {ORDER_STATUS[order.status] ?? order.status}
                  </span>
                  {order.shipment?.status && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                      Vận đơn {order.shipment.ghnOrderCode}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {formatDate(order.createdAt)}
                </span>
              </div>

              <ul className="mt-3 flex flex-col gap-1">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{formatVND(Number(item.price) * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Tổng cộng: {formatVND(order.total)}
                </span>
                <div className="flex gap-3 text-sm">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-semibold text-red-600 hover:underline dark:text-red-400"
                  >
                    Theo dõi đơn
                  </Link>
                  <Link
                    href={`/invoice/${order.id}`}
                    className="font-semibold text-zinc-600 hover:underline dark:text-zinc-400"
                  >
                    Hoá đơn
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
