'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatVND } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { PartIllustration } from './PartIllustration';
import { SpecsHoverPanel, type PanelPosition } from './SpecsHoverPanel';

const SHOW_DELAY_MS = 180;
const HIDE_DELAY_MS = 140;
const PANEL_GAP = 12;
const SCREEN_MARGIN = 8;

export function ProductCard({ product }: { product: Product }) {
  const inStock = product.stock > 0;
  const { addItem } = useCart();

  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [panelPos, setPanelPos] = useState<PanelPosition | null>(null);

  const hasSpecs =
    product.specs !== null &&
    product.specs !== undefined &&
    Object.keys(product.specs).length > 0;

  const clearShowTimer = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const positionPanel = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const panel = panelRef.current;
    const panelWidth = panel?.offsetWidth ?? 340;
    const panelHeight = panel?.offsetHeight ?? 0;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = rect.right + PANEL_GAP;
    if (left + panelWidth > viewportW - SCREEN_MARGIN) {
      left = rect.left - panelWidth - PANEL_GAP;
    }
    if (left < SCREEN_MARGIN) {
      left = Math.min(
        Math.max(SCREEN_MARGIN, rect.left),
        Math.max(SCREEN_MARGIN, viewportW - panelWidth - SCREEN_MARGIN),
      );
    }

    let top = rect.top;
    if (panelHeight > 0) {
      if (top + panelHeight > viewportH - SCREEN_MARGIN) {
        top = viewportH - SCREEN_MARGIN - panelHeight;
      }
      if (top < SCREEN_MARGIN) top = SCREEN_MARGIN;
    }

    setPanelPos((prev) =>
      prev && prev.top === top && prev.left === left ? prev : { top, left },
    );
  }, []);

  const canHover =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const handleEnter = () => {
    if (!hasSpecs || !canHover) return;
    clearHideTimer();
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      positionPanel();
      setPanelPos((prev) => prev ?? { top: -9999, left: -9999 });
      requestAnimationFrame(positionPanel);
      showTimerRef.current = null;
    }, SHOW_DELAY_MS);
  };

  const scheduleHide = () => {
    clearShowTimer();
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setPanelPos(null);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  };

  const cancelHide = () => {
    clearHideTimer();
  };

  const isPanelOpen = panelPos !== null;

  useLayoutEffect(() => {
    if (isPanelOpen) positionPanel();
  }, [isPanelOpen, positionPanel]);

  useEffect(() => {
    if (!isPanelOpen) return;

    const update = () => positionPanel();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isPanelOpen, positionPanel]);

  useEffect(() => {
    return () => {
      clearShowTimer();
      clearHideTimer();
    };
  }, []);

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={scheduleHide}
    >
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

      {hasSpecs && isPanelOpen && panelPos && (
        <SpecsHoverPanel
          product={product}
          position={panelPos}
          panelRef={panelRef}
          onPointerEnter={cancelHide}
          onPointerLeave={scheduleHide}
        />
      )}
    </div>
  );
}
