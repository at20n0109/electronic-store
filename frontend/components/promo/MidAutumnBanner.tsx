'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPromoRange, isPromoSaleActive, PROMO } from '@/lib/promo';
import {
  CloudBlob,
  LanternString,
  MoonOrb,
  Sparkle,
} from '@/components/promo/MidAutumnArt';

const DISMISS_KEY = 'pcstore_promo_dismissed';

const DISMISS_BTN =
  'absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-sm text-[#8a5a00]/70 transition-colors hover:bg-[#f2d9a8]/70 hover:text-[#8a5a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700';

const CTA_BTN =
  'inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#e03e2d] px-6 font-display text-sm font-bold uppercase tracking-widest text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_3px_0_#9a1f14] transition-all duration-150 hover:-translate-y-px hover:bg-[#ef4a33] active:translate-y-[2px] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbe8d0]';

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function MidAutumnPromo() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {
      // ignore
    }
  }, []);

  const active = isPromoSaleActive();
  if (!active || dismissed) return null;

  const range = formatPromoRange();

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative z-40 overflow-hidden border-b border-[#e2cba0] bg-[linear-gradient(120deg,#faf3e4_0%,#fbead2_45%,#f6d8b4_100%)] text-[#2f2117]">
      {/* graticule — tín hiệu brand (PC Store) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(150,90,20,0.07) 1px, transparent 1px)',
          backgroundSize: '44px 100%',
        }}
      />
      <CloudBlob className="pointer-events-none absolute -bottom-3 left-[38%] w-28 text-[#f6d8b4]/90 md:w-40" />
      <Sparkle
        size={14}
        className="pointer-events-none absolute left-[16%] bottom-[24%] text-[#f2a11e]"
      />
      <Sparkle
        size={10}
        className="pointer-events-none absolute left-[54%] top-[18%] hidden text-[#e8871a]/80 sm:block"
      />
      <Sparkle
        size={12}
        className="pointer-events-none absolute left-[72%] bottom-[20%] text-[#e2a33b]"
      />

      {/* đèn lồng thả từ mép trên */}
      <LanternString
        uid="band"
        className="pointer-events-none absolute left-4 top-2 z-10 scale-[0.85] opacity-90 sm:left-8 md:left-12"
      />

      <button type="button" onClick={dismiss} aria-label="Đóng thông báo khuyến mãi" className={DISMISS_BTN}>
        <CloseIcon />
      </button>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:gap-10 md:py-14 md:pl-16">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#e3b23c] bg-[#fff7db] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#8a5a00]">
            <Sparkle size={9} className="text-[#f2a11e]" />
            {PROMO.badge} · {range}
          </p>
          <h2 className="mt-4 font-display text-[34px] font-bold leading-[1.05] tracking-tight text-[#b02010] sm:text-5xl md:text-[60px]">
            GIẢM 30%
            <span className="mt-1 block font-display text-[24px] font-bold tracking-tight text-[#2f2117] sm:text-3xl md:text-[32px]">
              TOÀN BỘ LINH KIỆN
            </span>
          </h2>
          <p className="mt-3 max-w-xl text-[15px] font-medium leading-relaxed text-[#7a4a2b]">
            Rằm tháng Tám này, cả kho PC Store đồng loạt giảm thẳng 30% —
            CPU, VGA, RAM, build sẵn. Giá real, không bóng bẩy.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href={PROMO.href} className={CTA_BTN}>
              {PROMO.cta}
              <span aria-hidden="true">→</span>
            </Link>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#8a5a00]">
              chỉ còn đến 20.10 — mọi ngăn kho
            </p>
          </div>
        </div>

        <MoonOrb
          uid="band"
          size={210}
          className="pointer-events-none absolute -right-8 -top-8 opacity-25 sm:opacity-40 md:static md:ml-auto md:shrink-0 md:opacity-100"
        />
      </div>
    </div>
  );
}