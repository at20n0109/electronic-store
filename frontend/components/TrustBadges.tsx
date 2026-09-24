export function TrustBadges() {
  const badges = [
    { label: 'Chính hãng', sublabel: '100% thật' },
    { label: 'Bảo hành', sublabel: 'Uy tín' },
    { label: 'Giao hàng', sublabel: 'Nhanh 2h' },
    { label: 'Thanh toán', sublabel: 'Đa dạng' },
  ];

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-4">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {badge.label}
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {badge.sublabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
