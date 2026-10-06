'use client';

const ITEMS = [
  'CPU',
  'GPU',
  'MAINBOARD',
  'RAM',
  'SSD / NVMe',
  'NGUỒN',
  'VỎ MÁY',
  'TẢN NHIỆT',
  'MÀN HÌNH',
  'LAPTOP',
];

export function BomMarquee() {
  const row = (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center gap-6 pr-6"
    >
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-6">
          <span className="font-data text-[13px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
            {item}
          </span>
          <span className="h-2 w-2 rotate-45 border border-zinc-700" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden border-y border-zinc-800 bg-zinc-950 py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-zinc-950 to-transparent" />
      <div className="flex w-max animate-[bom-marquee_28s_linear_infinite] motion-reduce:w-full motion-reduce:animate-none">
        {row}
        {row}
        {row}
      </div>
      <style jsx>{`
        @keyframes bom-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  );
}