export const PROMO = {
  slug: 'mid-autumn-2026',
  name: 'Trung Thu 2026',
  badge: 'TRUNG THU',
  headline: 'GIẢM 30% TOÀN BỘ LINH KIỆN',
  cta: 'MUA NGAY',
  href: '/san-pham',
  /** Trung thu 2026 — rằm tháng Tám (25/09/2026) nằm giữa chiến dịch. Giờ VN +07:00. */
  startsAt: new Date('2026-09-20T00:00:00+07:00'),
  endsAt: new Date('2026-10-20T23:59:59+07:00'),
} as const;

export function isPromoSaleActive(now: Date = new Date()): boolean {
  return now >= PROMO.startsAt && now <= PROMO.endsAt;
}

export function formatPromoRange(): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(PROMO.startsAt.getDate())}.${pad(PROMO.startsAt.getMonth() + 1)} — ${pad(PROMO.endsAt.getDate())}.${pad(PROMO.endsAt.getMonth() + 1)}`;
}