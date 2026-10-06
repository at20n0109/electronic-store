'use client';

import type { RefObject } from 'react';
import type { Product } from '@/lib/types';

export type PanelPosition = { top: number; left: number };

export function SpecsHoverPanel({
  product,
  position,
  panelRef,
  onPointerEnter,
  onPointerLeave,
}: {
  product: Product;
  position: PanelPosition;
  panelRef: RefObject<HTMLDivElement | null>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const specs = product.specs;
  if (!specs) return null;

  const entries = Object.entries(specs);
  if (entries.length === 0) return null;

  return (
    <div
      ref={panelRef}
      role="tooltip"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-[340px] max-w-[calc(100vw-16px)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40"
    >
      <div className="border-b border-zinc-200 bg-red-600/5 px-4 py-3 dark:border-zinc-700 dark:bg-red-600/10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
          Thông số kỹ thuật
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {product.name}
        </p>
      </div>

      <dl className="max-h-[60vh] overflow-y-auto px-4 py-1">
        {entries.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-800"
          >
            <dt className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
              {label}
            </dt>
            <dd className="text-right text-xs font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
