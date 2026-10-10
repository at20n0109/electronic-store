'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { checkout, createOrder, getPaymentMethods, safeNavigate, submitAtm } from '@/lib/api';
import type { CreateOrderFields, PaymentMethod } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface PlacedOrder {
  orderId: string;
  provider: string;
  paymentId?: string;
  details?: Record<string, unknown>;
  amount?: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refresh, loading } = useCart();
  const [fields, setFields] = useState<CreateOrderFields>({
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
  });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  useEffect(() => {
    getPaymentMethods()
      .then((list) => {
        const enabled = list.filter((method) => method.enabled);
        setMethods(enabled.length > 0 ? enabled : list);
        setProvider((current) =>
          current && enabled.some((method) => method.provider === current)
            ? current
            : enabled[0]?.provider,
        );
      })
      .catch(() => setMethods([]));
  }, []);

  if (loading && !placed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-zinc-500">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  if (!placed && cart?.itemCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-zinc-600">Giỏ hàng của bạn đang trống.</p>
        <Link
          href="/"
          className="text-red-600 underline"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fields.receiverName.trim().length < 2) {
      setError('Vui lòng nhập đúng họ tên khách hàng.');
      return;
    }
    if (!/^\d{8,15}$/.test(fields.receiverPhone)) {
      setError('Số điện thoại phải gồm 8-15 chữ số.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const order = await createOrder({ ...fields, note });
      void refresh();
      const result = (await checkout(order.id, provider)) as {
        checkoutUrl?: string;
        clientSecret?: string;
        status?: string;
        details?: Record<string, unknown>;
        paymentId?: string;
        amount?: number;
      };

      if (result.checkoutUrl) {
        // The provider URL is server-issued but still validated before the
        // browser is handed off to a third-party domain.
        if (!safeNavigate(result.checkoutUrl)) {
          setError('Đường dẫn thanh toán không hợp lệ. Vui lòng thử lại.');
        }
        return;
      }

      if (result.status === 'succeeded') {
        router.push(`/invoice/${order.id}`);
        return;
      }

      if (result.status === 'pending') {
        setPlaced({
          orderId: order.id,
          provider: provider ?? '',
          paymentId: result.paymentId,
          details: result.details,
          amount: result.amount,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Đặt hàng thất bại',
      );
    } finally {
      setBusy(false);
    }
  }

  const subtotal = cart?.subtotal ?? 0;

  if (placed) {
    if (placed.provider === 'atm-mock') {
      return <AtmMockForm placed={placed} />;
    }
    return <PlacedView placed={placed} />;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-3">
      <form onSubmit={onSubmit} className="lg:col-span-2 space-y-5">
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Thanh toán
        </h1>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Họ và tên
          </label>
          <input
            value={fields.receiverName}
            onChange={(e) =>
              setFields({
                ...fields,
                receiverName: e.target.value.replace(/[^\p{L}\s'.-]/gu, ''),
              })
            }
            required
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Số điện thoại
          </label>
          <input
            value={fields.receiverPhone}
            type="tel"
            inputMode="numeric"
            maxLength={15}
            onChange={(e) =>
              setFields({
                ...fields,
                receiverPhone: e.target.value.replace(/[^\d]/g, ''),
              })
            }
            required
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Địa chỉ giao hàng
          </label>
          <textarea
            value={fields.receiverAddress}
            onChange={(e) =>
              setFields({ ...fields, receiverAddress: e.target.value })
            }
            required
            rows={3}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Ghi chú đơn hàng
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: giao sau 18h"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {methods.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Phương thức thanh toán
            </label>
            <div className="space-y-2">
              {methods.map((method) => {
                const active = provider === method.provider;
                return (
                  <label
                    key={method.provider}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                      active
                        ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/30'
                        : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={method.provider}
                      checked={active}
                      onChange={() => setProvider(method.provider)}
                      className="accent-red-600"
                    />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {method.label}
                    </span>
                    {method.provider === 'momo' && (
                      <span className="text-xs text-zinc-500">Quét QR / ví điện tử</span>
                    )}
                    {method.provider === 'vnpay' && (
                      <span className="text-xs text-zinc-500">Thanh toán qua cổng VNPay</span>
                    )}
                    {method.provider === 'zalopay' && (
                      <span className="text-xs text-zinc-500">Thanh toán qua ZaloPay</span>
                    )}
                    {method.provider === 'paypal' && (
                      <span className="text-xs text-zinc-500">Chuyển tới PayPal</span>
                    )}
                    {method.provider === 'bank' && (
                      <span className="text-xs text-zinc-500">Chuyển khoản đến tài khoản của cửa hàng</span>
                    )}
                    {method.provider === 'cod' && (
                      <span className="text-xs text-zinc-500">Trả tiền mặt khi nhận hàng</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? 'Đang xử lý...' : `Thanh toán ${formatVND(subtotal)}`}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-heading text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Tóm tắt đơn hàng
        </h2>
        <ul className="space-y-3 text-sm">
          {cart?.items.map((item) => (
            <li key={item.id} className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>{formatVND(item.product.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex justify-between font-semibold text-zinc-900 dark:text-zinc-50">
            <span>Tổng cộng</span>
            <span>{formatVND(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

type BankAccountInfo = {
  bank?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
  holder?: string;
  amountNote?: string;
};

function PlacedView({ placed }: { placed: PlacedOrder }) {
  const bank = (placed.details?.bankAccount ?? null) as BankAccountInfo | null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600 dark:bg-green-900/40 dark:text-green-400">
        ✓
      </div>
      <h1 className="font-heading mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Đặt hàng thành công
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {placed.provider === 'cod' &&
          'Đơn hàng đã được ghi nhận — bạn sẽ thanh toán khi nhận hàng.'}
        {placed.provider === 'bank' &&
          'Đơn hàng đã được ghi nhận — vui lòng chuyển khoản theo thông tin bên dưới. Đơn sẽ được xác nhận sau khi chúng tôi nhận được tiền.'}
        {placed.provider !== 'cod' &&
          placed.provider !== 'bank' &&
          'Đơn hàng đã được ghi nhận và đang được xử lý.'}
      </p>

      {placed.provider === 'bank' && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-heading mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Thông tin chuyển khoản
          </h2>
          <dl className="space-y-3 text-sm">
            {bank?.bank && (
              <div className="flex justify-between gap-6">
                <dt className="text-zinc-500 dark:text-zinc-400">Ngân hàng</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-50">{bank.bank}</dd>
              </div>
            )}
            {bank?.accountName && (
              <div className="flex justify-between gap-6">
                <dt className="text-zinc-500 dark:text-zinc-400">Chủ tài khoản</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-50">{bank.accountName}</dd>
              </div>
            )}
            {bank?.accountNumber && (
              <div className="flex justify-between gap-6">
                <dt className="text-zinc-500 dark:text-zinc-400">Số tài khoản</dt>
                <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                  {bank.accountNumber}
                </dd>
              </div>
            )}
            {bank?.branch && (
              <div className="flex justify-between gap-6">
                <dt className="text-zinc-500 dark:text-zinc-400">Chi nhánh</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-50">{bank.branch}</dd>
              </div>
            )}
            {placed.amount !== undefined && (
              <div className="flex justify-between gap-6 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <dt className="text-zinc-500 dark:text-zinc-400">Số tiền</dt>
                <dd className="font-semibold text-red-600">{formatVND(placed.amount)}</dd>
              </div>
            )}
            {placed.orderId && (
              <div className="flex justify-between gap-6">
                <dt className="text-zinc-500 dark:text-zinc-400">Nội dung chuyển khoản</dt>
                <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                  {placed.orderId.slice(0, 12)}
                </dd>
              </div>
            )}
          </dl>
          {bank?.accountNumber && placed.amount !== undefined && (
            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h3 className="font-heading mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Quét mã VietQR để thanh toán
              </h3>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element -- a third-party QR image, deliberately not run through the image optimizer */}
                <img
                  src={vietQrUrl(bank.accountNumber, placed.amount, placed.orderId ?? '') ?? ''}
                  alt="VietQR"
                  className="h-48 w-48 rounded-xl border border-zinc-200 dark:border-zinc-700"
                />
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <p>
                    Số tiền: <span className="font-semibold text-red-600">{formatVND(placed.amount)}</span>
                  </p>
                  <p className="mt-1">
                    Nội dung: <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">{(placed.orderId ?? '').slice(0, 20)}</span>
                  </p>
                  <p className="mt-2 text-xs">
                    Mở ứng dụng ngân hàng (BIDV, Vietcombank, Techcombank,...) và quét mã này để thanh toán chính xác.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {placed.orderId && (
          <Link
            href={`/invoice/${placed.orderId}`}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-500 sm:w-auto"
          >
            Xem hoá đơn
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

function defaultLocalDateTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Builds the VietQR image URL. `accountNumber` comes from the API, so it is
 * validated against a digits-only pattern before being interpolated into a
 * third-party request.
 */
function vietQrUrl(
  accountNumber: string,
  amount: number,
  orderId: string,
): string | null {
  if (!/^\d{6,20}$/.test(accountNumber)) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const note = orderId.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  const url = new URL('https://img.vietqr.io/image/BIDV-compact2.png');
  url.pathname = `/image/BIDV-${accountNumber}-compact2.png`;
  url.searchParams.set('amount', String(Math.round(amount)));
  if (note) url.searchParams.set('addInfo', note);
  return url.toString();
}

const atmInputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

function AtmMockForm({ placed }: { placed: PlacedOrder }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    bank: '',
    transRef: '',
    timestamp: defaultLocalDateTime(),
    note: '',
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bank.trim() || !form.transRef.trim()) {
      setError('Vui lòng nhập đầy đủ ngân hàng và mã giao dịch.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Only the bank and transfer reference are submitted. The amount and the
      // order total are the server's to decide; collecting them here would put
      // a price the customer can edit into the settlement path.
      await submitAtm(placed.orderId, {
        bank: form.bank.trim(),
        transRef: form.transRef.trim(),
        timestamp: form.timestamp,
        note: form.note.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi thông tin thất bại');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600 dark:bg-green-900/40 dark:text-green-400">
          ✓
        </div>
        <h1 className="font-heading mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Đã gửi thông tin giao dịch
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Đơn hàng đang chờ nhân viên xác nhận. Trạng thái sẽ cập nhật ở hoá đơn.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/invoice/${placed.orderId}`}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-500 sm:w-auto"
          >
            Xem hoá đơn
          </Link>
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Thanh toán ATM / Internet Banking
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Nhập thông tin giao dịch bạn đã thực hiện. Dữ liệu được mã hoá an toàn.
      </p>

      <p
        data-testid="atm-amount"
        className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
      >
        Số tiền cần chuyển:{' '}
        <span className="font-semibold text-red-600">
          {placed.amount !== undefined ? formatVND(placed.amount) : '—'}
        </span>
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Ngân hàng
          </label>
          <input
            value={form.bank}
            onChange={(e) => update('bank', e.target.value)}
            required
            maxLength={64}
            className={atmInputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Mã giao dịch
          </label>
          <input
            value={form.transRef}
            onChange={(e) => update('transRef', e.target.value)}
            required
            maxLength={64}
            className={atmInputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Thời gian chuyển
          </label>
          <input
            type="datetime-local"
            value={form.timestamp}
            onChange={(e) => update('timestamp', e.target.value)}
            required
            className={atmInputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Nội dung chuyển khoản
          </label>
          <input
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
            maxLength={200}
            className={atmInputClass}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? 'Đang gửi...' : 'Gửi thông tin giao dịch'}
        </button>
      </form>
    </div>
  );
}
