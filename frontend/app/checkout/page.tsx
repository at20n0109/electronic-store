'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { checkout, createOrder, getPaymentMethods } from '@/lib/api';
import type { CreateOrderFields, PaymentMethod } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart } = useCart();
  const [fields, setFields] = useState<CreateOrderFields>({
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
  });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [provider, setProvider] = useState<string | undefined>('mock');

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

  if (cart?.itemCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-zinc-600">Giỏ hàng của bạn đang trống.</p>
        <a
          href="/"
          className="text-red-600 underline"
        >
          Tiếp tục mua sắm
        </a>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const order = await createOrder({ ...fields, note });
      const result = (await checkout(order.id, provider)) as {
        checkoutUrl?: string;
        clientSecret?: string;
        status?: string;
      };

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      if (result.clientSecret) {
        // Stripe client integration can be mounted here with @stripe/stripe-js.
        setError('Stripe is not available in this environment.');
        return;
      }

      if (result.status === 'succeeded') {
        router.push(`/invoice/${order.id}`);
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
              setFields({ ...fields, receiverName: e.target.value })
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
            onChange={(e) =>
              setFields({ ...fields, receiverPhone: e.target.value })
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
                    {method.provider === 'paypal' && (
                      <span className="text-xs text-zinc-500">Chuyển tới PayPal</span>
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
