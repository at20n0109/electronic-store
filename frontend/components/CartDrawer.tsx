'use client';

import Link from 'next/link';
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash,
  X,
} from '@phosphor-icons/react';
import { formatVND } from '@/lib/api';
import { useCart } from '@/context/CartContext';

export function CartToggle() {
  const { cart, openCart } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <button
      type="button"
      onClick={openCart}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:text-zinc-400"
      aria-label="Giỏ hàng"
    >
      <ShoppingCart size={20} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

export function CartDrawer() {
  const { cart, open, closeCart, error, updateItem, removeItem, clear } =
    useCart();

  if (!open) return null;

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/40"
      onClick={closeCart}
    >
      <div
        className="flex h-[80vh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="font-heading text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Giỏ hàng
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-4 mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <p>{error}</p>
            <Link
              href="/register"
              className="mt-1 inline-block font-semibold text-red-700 underline dark:text-red-300"
            >
              Tạo tài khoản mới để mua hàng
            </Link>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-zinc-500">
            <ShoppingCart size={48} className="mb-4 text-zinc-300" />
            <p>Giỏ hàng trống</p>
          </div>
        ) : (
          <div className="-m-2 flex-1 overflow-y-auto p-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatVND(item.product.price)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, Math.max(1, item.quantity - 1))
                    }
                    className="rounded-lg border border-zinc-300 p-1 dark:border-zinc-700"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, item.quantity + 1)}
                    className="rounded-lg border border-zinc-300 p-1 dark:border-zinc-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-600"
                  aria-label="Xóa"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex justify-between text-base font-semibold">
            <span className="text-zinc-600 dark:text-zinc-300">Tổng</span>
            <span className="text-zinc-900 dark:text-zinc-50">
              {formatVND(subtotal)}
            </span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => window.location.assign('/checkout')}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            Thanh toán
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="mt-2 w-full text-center text-sm text-zinc-500 hover:text-red-600"
            >
              Xóa giỏ hàng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
