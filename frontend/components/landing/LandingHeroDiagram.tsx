'use client';

import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';

export type DiagramPart = {
  slot: string;
  code: string;
  name: string;
  price: string;
  photoSrc?: string;
  photoAlt?: string;
};

const SLOT_LABEL: Record<string, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  mainboard: 'MAINBOARD',
  ram: 'RAM',
  storage: 'Ổ CỨNG',
  psu: 'NGUỒN',
  case: 'VỎ MÁY',
  cooling: 'TẢN NHIỆT',
};

function CornerBracket({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-4 w-4 border-zinc-500/70 ${className}`}
    />
  );
}

function MeasureTick() {
  return (
    <svg viewBox="0 0 120 12" aria-hidden="true" className="h-3 w-24 text-zinc-500">
      <path
        d="M0 6h120M10 2v8M25 3v6M40 4v4M55 4v4M70 3v6M85 3v6M100 4v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

export function LandingHeroDiagram({
  parts,
  total,
}: {
  parts: DiagramPart[];
  total: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative border border-zinc-800 bg-zinc-900/70">
      <CornerBracket className="-left-px -top-px border-l-2 border-t-2" />
      <CornerBracket className="-right-px -top-px border-r-2 border-t-2" />
      <CornerBracket className="-bottom-px -left-px border-b-2 border-l-2" />
      <CornerBracket className="-bottom-px -right-px border-b-2 border-r-2" />

<div className="absolute right-3 top-3 flex items-center gap-2 font-data text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">
        <span className="inline-block h-1.5 w-1.5 bg-red-600" />
        rev 09-2026
      </div>

      <div className="flex items-end justify-between px-5 pt-5">
        <div>
          <p className="font-data text-2xl font-semibold tracking-wide text-zinc-50">
            pc-10
          </p>
          <p className="mt-1 font-data text-[13px] font-medium uppercase tracking-[0.14em] text-zinc-300">
            7 món · bản vẽ khai triển
          </p>
        </div>
        <div className="pb-1 text-right font-data text-sm text-zinc-400">
          tổng
          <span className="ml-2 text-xl font-semibold text-zinc-50">{total}</span>
        </div>
      </div>

      <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
        {parts.map((part, index) => {
          const slot = SLOT_LABEL[part.slot] ?? part.slot.toUpperCase();
          return (
            <motion.div
              key={part.slot}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 + index * 0.07 }}
              className="group flex items-center gap-4 px-5 py-3"
            >
              <div className="relative h-14 w-16 shrink-0 border border-zinc-800 bg-zinc-950">
                {part.photoSrc ? (
                  <Image
                    src={part.photoSrc}
                    alt={part.photoAlt ?? part.code}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                ) : (
<span className="flex h-full items-center justify-center p-1 font-data text-[11px] uppercase tracking-widest text-zinc-300">
                    no-photo
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-data text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-300">
                    {slot}
                  </span>
                  <span className="shrink-0 font-data text-base font-semibold text-zinc-100">
                    {part.price}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-zinc-300">{part.name}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-5 py-3">
        <MeasureTick />
<span className="font-data text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">
          tỉ lệ 1 : 1 · giá tại kho
        </span>
      </div>
    </div>
  );
}
