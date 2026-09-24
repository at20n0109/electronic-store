'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatVND } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { PartIllustration } from './PartIllustration';

export function ProductCard({ product }: { product: Product }) {
  const inStock = product.stock > 0;
  const { addItem } = useCart();

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <Link
        href={`/products/${product.slug}`}
        className="relative block overflow-hidden"
      >
        <PartIllustration
          slug={product.category?.slug}
          product={product.slug}
          className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {inStock && product.stock <= 5 && (
          <span className="absolute left-2 top-2 rounded bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            Chỉ còn {product.stock}
          </span>
        )}
        {!inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white backdrop-blur-sm">
            Hết hàng
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            {product.category.name}
          </span>
        )}

        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 group-hover:text-red-600 dark:text-zinc-50 dark:group-hover:text-red-400">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatVND(product.price)}
          </span>
          <span
            className={
              inStock
                ? 'text-xs font-semibold text-red-600 dark:text-red-600'
                : 'text-xs font-medium text-zinc-400'
            }
          >
            {inStock ? `Còn ${product.stock}` : 'Hết hàng'}
          </span>
        </div>

        {inStock && (
          <button
            type="button"
            onClick={() => addItem(product.id)}
            className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-semibold text-white transition-colors hover:bg-red-600 dark:bg-zinc-800 dark:hover:bg-red-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Thêm vào giỏ
          </button>
        )}
      </div>
    </div>
  );
}
