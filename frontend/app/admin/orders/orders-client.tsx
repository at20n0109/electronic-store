'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  confirmCodOrder,
  createGhnShipment,
  formatVND,
  getAdminOrders,
  refreshGhnShipment,
} from '@/lib/api';
import type { AdminOrder } from '@/lib/types';

type Filter = 'PAID' | 'PENDING' | 'CANCELLED' | 'ALL';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'ALL', label: 'Tất cả' },
];

const ORDER_STATUS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  SUCCEEDED: 'Thành công',
  FAILED: 'Thất bại',
  CANCELED: 'Đã hủy',
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

/**
 * Mirrors the server-side rule: only a still-pending COD order can be settled
 * by hand. Every other provider marks itself paid through a verified
 * return/webhook path, so showing a button there would invite a release the
 * API would refuse anyway.
 */
function canApproveCod(order: AdminOrder): boolean {
  return (
    order.status === 'PENDING' &&
    order.payment?.provider === 'COD' &&
    order.payment?.status === 'PENDING'
  );
}

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

function ghnStatusLabel(status: string | null): string {
  if (!status) return 'Chưa rõ';
  return GHN_STATUS[status] ?? status;
}

export default function AdminOrdersClient() {
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [shipping, setShipping] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const load = useCallback(async (value: Filter) => {
    setLoading(true);
    try {
      const status = value === 'ALL' ? undefined : value;
      setOrders(await getAdminOrders(status));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách đơn');
    } finally {
      setLoading(false);
    }
  }, []);

  async function onApproveCod(orderId: string) {
    setConfirming(orderId);
    setNotice('');
    setError('');
    try {
      const result = await confirmCodOrder(orderId);
      setNotice(
        result.alreadyConfirmed
          ? 'Đơn này đã được duyệt trước đó.'
          : 'Đã duyệt đơn COD và chuyển sang đã thanh toán.',
      );
      // Reload the whole list: the order may now belong under a different
      // filter tab than the one it was approved from.
      await load(filter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Duyệt đơn thất bại, vui lòng thử lại.',
      );
    } finally {
      setConfirming(null);
    }
  }

  async function onCreateShipment(orderId: string) {
    setShipping(orderId);
    setNotice('');
    setError('');
    try {
      const result = await createGhnShipment(orderId);
      setNotice(
        result.alreadyCreated
          ? `Đơn này đã có vận đơn GHN ${result.ghnOrderCode}.`
          : `Đã tạo vận đơn GHN ${result.ghnOrderCode}.`,
      );
      await load(filter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Tạo vận đơn GHN thất bại.',
      );
    } finally {
      setShipping(null);
    }
  }

  async function onRefreshShipment(orderId: string) {
    setRefreshing(orderId);
    setNotice('');
    setError('');
    try {
      const result = await refreshGhnShipment(orderId);
      setNotice(
        `Vận đơn ${result.ghnOrderCode}: ${ghnStatusLabel(result.status)}.`,
      );
      // Only the refreshed row changes, so patch it in place instead of
      // re-fetching every order and losing the current filter position.
      setOrders((current) =>
        current.map((row) =>
          row.id === orderId && row.shipment
            ? { ...row, shipment: { ...row.shipment, status: result.status } }
            : row,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không cập nhật được trạng thái vận đơn.',
      );
    } finally {
      setRefreshing(null);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await getAdminOrders('PENDING');
        if (!active) return;
        setOrders(rows);
        setError('');
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Không tải được danh sách đơn',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Quản lý đơn hàng
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Duyệt đơn COD đã thu tiền, và theo dõi đơn đã thanh toán hoặc đang chờ
        xử lý.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setFilter(item.value);
              void load(item.value);
            }}
            className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors ${
              filter === item.value
                ? 'bg-red-600 text-white'
                : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load(filter)}
          className="h-9 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Tải lại
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {notice && !error && (
        <p className="mt-4 text-sm text-green-600 dark:text-green-400">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Đang tải...</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Không có đơn nào.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">
                  Đơn: {order.id.slice(0, 12)}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                      order.status,
                    )}`}
                  >
                    {ORDER_STATUS[order.status] ?? order.status}
                  </span>
                  {order.payment && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {order.payment.provider} ·{' '}
                      {PAYMENT_STATUS[order.payment.status] ??
                        order.payment.status}
                    </span>
                  )}
                </div>
              </div>

              {canApproveCod(order) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Đơn COD — duyệt sau khi đã thu tiền từ khách.
                  </p>
                  <button
                    type="button"
                    disabled={confirming === order.id}
                    onClick={() => void onApproveCod(order.id)}
                    className="h-9 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                  >
                    {confirming === order.id ? 'Đang duyệt...' : 'Duyệt đơn COD'}
                  </button>
                </div>
              )}

              <ShipmentPanel
                order={order}
                creating={shipping === order.id}
                refreshing={refreshing === order.id}
                onCreate={() => void onCreateShipment(order.id)}
                onRefresh={() => void onRefreshShipment(order.id)}
              />

              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <Row
                  label="Khách hàng"
                  value={order.user?.name || order.user?.email}
                />
                <Row label="Email" value={order.user?.email} />
                <Row label="Người nhận" value={order.receiverName} />
                <Row label="Số điện thoại" value={order.receiverPhone} />
                <Row label="Địa chỉ" value={order.receiverAddress} />
                <Row
                  label="Ngày tạo"
                  value={new Date(order.createdAt).toLocaleString('vi-VN')}
                />
              </dl>

              <ul className="mt-4 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between py-1.5 text-zinc-700 dark:text-zinc-300"
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{formatVND(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Tổng cộng</span>
                <span>{formatVND(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-right font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}

/**
 * GHN consignment for one order. A shipment is only created for an order that
 * has been paid: GHN takes physical custody once a consignment exists, so
 * dispatching an unpaid order would put goods in a courier's hands with no
 * money behind them.
 */
function ShipmentPanel({
  order,
  creating,
  refreshing,
  onCreate,
  onRefresh,
}: {
  order: AdminOrder;
  creating: boolean;
  refreshing: boolean;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  const shipment = order.shipment;
  const hasAddressCodes = Boolean(
    order.receiverDistrictId && order.receiverWardCode,
  );
  const canCreate = order.status === 'PAID' && hasAddressCodes;

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      {shipment ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">
                Mã vận đơn GHN:
              </span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                {shipment.ghnOrderCode}
              </span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                {ghnStatusLabel(shipment.status)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-zinc-500 dark:text-zinc-400">
              {shipment.fee !== null && (
                <span>Phí ship: {formatVND(shipment.fee)}</span>
              )}
              {shipment.codAmount !== null && shipment.codAmount > 0 && (
                <span>Thu hộ: {formatVND(shipment.codAmount)}</span>
              )}
              {shipment.expectedDeliveryTime && (
                <span>
                  Dự kiến giao:{' '}
                  {new Date(shipment.expectedDeliveryTime).toLocaleString(
                    'vi-VN',
                  )}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="h-8 rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {refreshing ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
          </button>
        </div>
      ) : order.status === 'PAID' && !hasAddressCodes ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Đơn này đặt trước khi bật chọn tỉnh/quận/phường nên chưa có mã địa
          chỉ GHN — không tạo được vận đơn. Đặt đơn mới sẽ có đầy đủ.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {order.status === 'PAID'
              ? 'Đã thanh toán — có thể tạo vận đơn GHN.'
              : 'Chỉ tạo vận đơn GHN sau khi đơn đã thanh toán.'}
          </p>
          <button
            type="button"
            disabled={!canCreate || creating}
            onClick={onCreate}
            title={
              canCreate
                ? undefined
                : 'Đơn phải đã thanh toán và có đủ mã tỉnh/quận/phường'
            }
            className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            {creating ? 'Đang tạo...' : 'Tạo vận đơn GHN'}
          </button>
        </div>
      )}
    </div>
  );
}
