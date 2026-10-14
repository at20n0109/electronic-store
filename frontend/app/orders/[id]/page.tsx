'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ApiError,
  formatVND,
  getOrder,
  refreshOrderShipment,
} from '@/lib/api';
import type { Order } from '@/lib/types';
import {
  CheckCircle,
  ClipboardText,
  House,
  Package,
  Spinner,
  Truck,
} from '@phosphor-icons/react';

type PageState = 'loading' | 'ready' | 'notfound' | 'denied' | 'error';

const ORDER_STATUS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

const GHN_STATUS: Record<string, string> = {
  ready_to_pick: 'Chờ lấy hàng',
  picking: 'Đang lấy hàng',
  cancel: 'Đã huỷ',
  money_collect_picking: 'Đang thu tiền',
  picked: 'Đã lấy hàng',
  storing: 'Đang bàn giao',
  transporting: 'Đang vận chuyển',
  sorting: 'Đang phân loại',
  delivering: 'Đang giao hàng',
  delivered: 'Đã giao',
  delivery_fail: 'Giao thất bại',
  waiting_to_return: 'Chờ hoàn',
  return: 'Đang hoàn',
  returned: 'Đã hoàn',
};

/**
 * Happy-path milestones in delivery order. A shipment status maps to the
 * furthest step it has reached; terminal failure statuses (cancel, return…)
 * are rendered as a warning banner instead of advancing the stepper.
 */
const TIMELINE: { match: string[]; label: string }[] = [
  { match: ['ready_to_pick', 'picking'], label: 'Chờ lấy hàng' },
  { match: ['picked', 'money_collect_picking'], label: 'Đã lấy hàng' },
  { match: ['storing', 'sorting', 'transporting'], label: 'Đang vận chuyển' },
  { match: ['delivering'], label: 'Đang giao hàng' },
  { match: ['delivered'], label: 'Đã giao' },
];

const FAILURE_STATUSES = new Set([
  'cancel',
  'delivery_fail',
  'waiting_to_return',
  'return',
  'returned',
]);

function timelineIndex(status: string | null): number {
  if (!status) return -1;
  for (let i = TIMELINE.length - 1; i >= 0; i--) {
    if (TIMELINE[i].match.includes(status)) return i;
  }
  return -1;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [state, setState] = useState<PageState>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [refreshError, setRefreshError] = useState('');

  const load = useCallback(async () => {
    const o = await getOrder(orderId);
    setOrder(o);
    setState('ready');
    return o;
  }, [orderId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setState('denied');
        } else if (err instanceof ApiError && err.status === 404) {
          setState('notfound');
        } else {
          setState('error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  async function handleRefresh() {
    if (!order) return;
    setRefreshing(true);
    setNotice('');
    setRefreshError('');
    try {
      await refreshOrderShipment(order.id);
      await load();
      setNotice('Đã cập nhật trạng thái vận đơn.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setRefreshError('Đơn hàng chưa có vận đơn. Vui lòng thử lại sau.');
      } else {
        setRefreshError('Không cập nhật được trạng thái. Vui lòng thử lại.');
      }
    } finally {
      setRefreshing(false);
    }
  }

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
          Vui lòng đăng nhập để theo dõi đơn hàng.
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

  if (state === 'notfound') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-heading text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Không tìm thấy đơn hàng
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.
        </p>
      </div>
    );
  }

  if (state === 'error' || !order) {
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

  const shipment = order.shipment ?? null;
  const ghnStatus = shipment?.status ?? null;
  const stepIndex = timelineIndex(ghnStatus);
  const isFailure = !!ghnStatus && FAILURE_STATUSES.has(ghnStatus);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Theo dõi đơn hàng
        </h1>
        <span className="text-sm text-zinc-500">#{order.id.slice(0, 8)}</span>
      </div>

      {/* Trạng thái tổng quan */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                order.status === 'PAID'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                  : order.status === 'CANCELLED'
                    ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
              }`}
            >
              {ORDER_STATUS[order.status] ?? order.status}
            </span>
            {order.paidAt && (
              <span className="text-sm text-zinc-500">
                Thanh toán lúc {formatDate(order.paidAt)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || !shipment}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {refreshing ? (
              <Spinner size={16} className="animate-spin" />
            ) : (
              <Truck size={16} weight="bold" />
            )}
            Cập nhật trạng thái
          </button>
        </div>

        {notice && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">{notice}</p>
        )}
        {refreshError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{refreshError}</p>
        )}
      </div>

      {/* Vận đơn + timeline */}
      {order.status === 'PAID' && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Package size={20} weight="bold" className="text-zinc-700 dark:text-zinc-300" />
            <h2 className="font-heading text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Vận đơn GHN
            </h2>
          </div>

          {!shipment ? (
            <p className="mt-3 text-sm text-zinc-500">
              Đơn hàng đã được thanh toán và đang chờ xử lý vận chuyển. Vận đơn
              sẽ xuất hiện tại đây ngay khi được tạo.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <span>
                  Mã vận đơn:{' '}
                  <strong className="text-zinc-900 dark:text-zinc-50">
                    {shipment.ghnOrderCode}
                  </strong>
                </span>
                {shipment.expectedDeliveryTime && (
                  <span>
                    Dự kiến:{' '}
                    {new Date(shipment.expectedDeliveryTime).toLocaleDateString('vi-VN')}
                  </span>
                )}
                {ghnStatus && (
                  <span>
                    Trạng thái:{' '}
                    <strong className="text-zinc-900 dark:text-zinc-50">
                      {GHN_STATUS[ghnStatus] ?? ghnStatus}
                    </strong>
                  </span>
                )}
              </div>

              {isFailure ? (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  Đơn vận chuyển đang gặp sự cố:{' '}
                  <strong>{GHN_STATUS[ghnStatus] ?? ghnStatus}</strong>. Liên hệ
                  hỗ trợ nếu bạn cần thêm thông tin.
                </div>
              ) : (
                <ol className="mt-5 flex flex-col gap-0">
                  {TIMELINE.map((step, i) => {
                    const done = stepIndex > i;
                    const current = stepIndex === i;
                    return (
                      <li key={step.label} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              done || current
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-zinc-300 bg-white text-zinc-300 dark:border-zinc-700 dark:bg-zinc-900'
                            }`}
                          >
                            {done ? (
                              <CheckCircle size={16} weight="fill" />
                            ) : current ? (
                              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                            )}
                          </span>
                          {i < TIMELINE.length - 1 && (
                            <span
                              className={`w-0.5 flex-1 ${done ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                            />
                          )}
                        </div>
                        <div className="pb-6 pt-1">
                          <p
                            className={`text-sm font-medium ${
                              done || current
                                ? 'text-zinc-900 dark:text-zinc-50'
                                : 'text-zinc-400 dark:text-zinc-600'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </div>
      )}

      {/* Chi tiết đơn hàng */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <ClipboardText size={20} weight="bold" className="text-zinc-700 dark:text-zinc-300" />
          <h2 className="font-heading text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Chi tiết đơn hàng
          </h2>
        </div>

        <ul className="mt-3 flex flex-col gap-2">
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

        <dl className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <dt>Tạm tính</dt>
            <dd>{formatVND(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <dt>Phí vận chuyển</dt>
            <dd>{formatVND(order.shipping)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-zinc-900 dark:text-zinc-50">
            <dt>Tổng cộng</dt>
            <dd>{formatVND(order.total)}</dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
          <p className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-50">
            <House size={16} weight="bold" /> Giao đến
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {order.receiverName} — {order.receiverPhone}
            <br />
            {order.receiverAddress}
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            href={`/invoice/${order.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Xem hoá đơn
          </Link>
          <Link
            href="/orders"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Tất cả đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
