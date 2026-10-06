'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PcBuild } from '@/lib/types';
import { formatVND } from '@/lib/api';
import { SLOT_LABELS, getKeySpecs } from '@/lib/pcbuild';
import { getProductPhoto } from '@/lib/photos';

const SHOW_DELAY_MS = 180;
const HIDE_DELAY_MS = 140;
const PANEL_GAP = 12;
const SCREEN_MARGIN = 8;
const PANEL_WIDTH = 360;

const TIER_ACCENT: Record<number, string> = {
  10: '#10b981',
  20: '#0284c7',
  30: '#f59e0b',
  40: '#ef4444',
};

const TIER_LABEL: Record<number, string> = {
  10: '10 triệu',
  20: '20 triệu',
  30: '30 triệu',
  40: '40 triệu',
};

function PcBuildPreview({ build, accent }: { build: PcBuild; accent: string }) {
  const [failed, setFailed] = useState(false);
  const caseItem = build.items.find((item) => item.slot === 'case');
  const photo = caseItem ? getProductPhoto(caseItem.product) : undefined;

  if (photo && !failed) {
    return (
      <div className="absolute inset-0">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="360px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950">
      <div
        className="flex h-16 w-32 flex-col items-center justify-center rounded-xl border-2"
        style={{ borderColor: accent }}
      >
        <span
          className="font-mono text-2xl font-black"
          style={{ color: accent }}
        >
          {build.tier}M
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          GAMING
        </span>
      </div>
    </div>
  );
}

type PanelPosition = { top: number; left: number };

export function PcBuildHover({
  build,
  children,
}: {
  build: PcBuild;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [position, setPosition] = useState<PanelPosition | null>(null);

  const accent = TIER_ACCENT[build.tier] ?? '#ef4444';

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
    const panelWidth = panel?.offsetWidth ?? PANEL_WIDTH;
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

    setPosition((prev) =>
      prev && prev.top === top && prev.left === left ? prev : { top, left },
    );
  }, []);

  const handleEnter = () => {
    if (
      typeof window === 'undefined' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }
    clearHideTimer();
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      positionPanel();
      setPosition((prev) => prev ?? { top: -9999, left: -9999 });
      requestAnimationFrame(positionPanel);
      showTimerRef.current = null;
    }, SHOW_DELAY_MS);
  };

  const scheduleHide = () => {
    clearShowTimer();
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setPosition(null);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  };

  const cancelHide = () => {
    clearHideTimer();
  };

  const isOpen = position !== null;

  useLayoutEffect(() => {
    if (isOpen) positionPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const update = () => positionPanel();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, positionPanel]);

  useEffect(() => {
    return () => {
      clearShowTimer();
      clearHideTimer();
    };
  }, []);

  const outOfStock = build.items.filter((item) => item.product.stock <= 0);

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={scheduleHide}
    >
      {children}

      {isOpen && position && (
        <div
          ref={panelRef}
          role="tooltip"
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 w-[360px] max-w-[calc(100vw-16px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/50"
        >
          <div className="relative h-28 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
            <PcBuildPreview build={build} accent={accent} />
            <span
              className="absolute right-2.5 top-2.5 rounded-lg px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {TIER_LABEL[build.tier] ?? `${build.tier} triệu`}
            </span>
          </div>

          <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
              {build.name}
            </p>
            <p className="mt-0.5 text-xs font-medium text-red-600 dark:text-red-400">
              {build.tagline}
            </p>
          </div>

          <div className="px-4 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Thông số nổi bật
            </p>
          </div>

          <dl className="max-h-[38vh] overflow-y-auto px-4 pb-1">
            {build.items.map((item) => {
              const keySpecs = getKeySpecs(item.product, item.slot);
              const oos = item.product.stock <= 0;
              return (
                <div
                  key={item.slot}
                  className="flex items-start justify-between gap-3 border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-800"
                >
                  <dt className="shrink-0 pt-0.5">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {SLOT_LABELS[item.slot] ?? item.slot}
                    </span>
                  </dt>
                  <dd className="min-w-0 text-right">
                    <p
                      className={`text-xs font-semibold leading-snug ${oos ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}
                    >
                      {item.product.name}
                    </p>
                    {keySpecs.length > 0 && (
                      <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                        {keySpecs.join(' · ')}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] font-bold text-red-600">
                      {formatVND(item.product.price)}
                    </p>
                  </dd>
                </div>
              );
            })}
          </dl>

          {outOfStock.length > 0 && (
            <p className="border-t border-zinc-100 bg-amber-50 px-4 py-1.5 text-[11px] font-medium text-amber-700 dark:border-zinc-800 dark:bg-amber-950/40 dark:text-amber-300">
              {outOfStock.length} linh kiện đang hết hàng
            </p>
          )}

          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Tổng cộng
              </p>
              <p className="text-base font-bold text-red-600">
                {formatVND(build.total)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {build.remaining >= 0 ? 'Còn trong ngân sách' : 'Vượt ngân sách'}
              </p>
              <p
                className={`text-xs font-bold ${build.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}
              >
                {formatVND(Math.abs(build.remaining))}
              </p>
            </div>
            <span className="rounded-lg bg-zinc-950 px-2.5 py-1.5 text-[11px] font-semibold text-white dark:bg-zinc-800">
              Xem chi tiết →
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
