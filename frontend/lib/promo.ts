export const PROMO = {
  slug: 'mid-autumn-2026',
  name: 'Trung Thu 2026',
  badge: 'TRUNG THU',
  headline: 'GIẢM 30% TOÀN BỘ LINH KIỆN',
  cta: 'MUA NGAY',
  href: '/san-pham',
  /** Trung thu 2026 — rằm tháng Tám (25/09/2026) nằm giữa chiến dịch. Giờ VN +07:00. */
  startsAt: '2026-09-20T00:00:00+07:00',
  endsAt: '2026-10-20T23:59:59+07:00',
} as const;

export function isPromoSaleActive(now: Date = new Date()): boolean {
  return now >= new Date(PROMO.startsAt) && now <= new Date(PROMO.endsAt);
}

function formatDayMonth(iso: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})T/.exec(iso);
  return match ? `${match[2]}.${match[1]}` : iso;
}

export function formatPromoRange(): string {
  return `${formatDayMonth(PROMO.startsAt)} — ${formatDayMonth(PROMO.endsAt)}`;
}