'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { confirmAtm, formatVND, getAtmSubmissions } from '@/lib/api';
import type { AtmSubmission } from '@/lib/api';

const FILTERS = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'all', label: 'Tất cả' },
] as const;

export default function AdminAtmClient() {
  const [filter, setFilter] = useState<'pending' | 'confirmed' | 'all'>('pending');
  const [items, setItems] = useState<AtmSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      setItems(await getAtmSubmissions(status));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }, []);

  // The server component already verified the caller's role, so the client
  // starts on data immediately instead of re-checking identity first.
  // `loading` starts true, so the initial fetch does not need to set it.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await getAtmSubmissions('pending');
        if (!active) return;
        setItems(rows);
        setError('');
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được danh sách');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onConfirm(paymentId: string) {
    setBusyId(paymentId);
    setError('');
    try {
      await confirmAtm(paymentId);
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác nhận thất bại');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Duyệt giao dịch ATM / Internet Banking
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Kiểm tra thông tin khách gửi và xác nhận để đánh dấu đơn hàng đã thanh toán.
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

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Không có giao dịch nào.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">
                  Đơn: {item.orderId.slice(0, 12)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.status === 'confirmed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  }`}
                >
                  {item.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                </span>
              </div>

              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Khách hàng" value={item.order?.receiverName} />
                <Row label="Số điện thoại" value={item.order?.receiverPhone} />
                <Row label="Ngân hàng" value={item.submitted?.bank} />
                <Row label="Mã giao dịch" value={item.submitted?.transRef} mono />
                <Row
                  label="Số tiền chuyển"
                  value={
                    item.submitted?.amount !== undefined
                      ? formatVND(Number(item.submitted.amount))
                      : undefined
                  }
                />
                <Row
                  label="Tổng đơn"
                  value={item.order ? formatVND(item.order.total) : undefined}
                />
                <Row label="Thời gian chuyển" value={item.submitted?.timestamp} />
                <Row label="Nội dung" value={item.submitted?.note ?? undefined} />
              </dl>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Link
                  href={`/invoice/${item.orderId}`}
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  Xem hoá đơn
                </Link>
                {item.status === 'pending' && (
                  item.amountMatchesOrder === false ? (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Số tiền chuyển không khớp tổng đơn — không thể xác nhận
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConfirm(item.paymentId)}
                      disabled={busyId === item.paymentId}
                      className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    >
                      {busyId === item.paymentId ? 'Đang xác nhận...' : 'Xác nhận đã thanh toán'}
                    </button>
                  )
                )}
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
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd
        className={`text-right font-semibold text-zinc-900 dark:text-zinc-50 ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
