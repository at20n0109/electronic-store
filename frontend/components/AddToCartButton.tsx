'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';

function CartBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export function AddToCartButton({
  productId,
  inStock = true,
  className,
}: {
  productId: string;
  inStock?: boolean;
  className?: string;
}) {
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (added) {
      timer = setTimeout(() => setAdded(false), 1600);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [added]);

  async function onClick() {
    setBusy(true);
    try {
      await addItem(productId);
      setAdded(true);
    } finally {
      setBusy(false);
    }
  }

  const label = busy
    ? 'Đang thêm...'
    : added
      ? 'Đã thêm vào giỏ'
      : 'Thêm vào giỏ hàng';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!inStock || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-base font-semibold text-white transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:focus:ring-offset-zinc-900 ${className ?? ''}`}
    >
      {!inStock ? (
        <CartBadge />
      ) : (
        <>
          {added ? (
            <span className="text-xl leading-none">✓</span>
          ) : (
            <CartBadge />
          )}
          {label}
        </>
      )}
    </button>
  );
}