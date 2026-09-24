const FEATURES = [
  {
    title: 'Chính hãng 100%',
    description: 'Tất cả sản phẩm đều là hàng chính hãng, có bảo hành rõ ràng.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Giao hàng nhanh',
    description: 'Giao hàng tận nơi trong 2 giờ tại Hà Nội & TP.HCM.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
        <rect width="16" height="13" x="2" y="5" rx="2" />
        <path d="M16 5V3a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M22 7h-4v13h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M2 7h4v13H2a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
        <circle cx="7" cy="14" r="1.5" />
        <circle cx="17" cy="14" r="1.5" />
      </svg>
    ),
  },
  {
    title: 'Bảo hành uy tín',
    description: 'Hỗ trợ đổi trả trong 15 ngày, bảo hành theo nhà sản xuất.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    ),
  },
  {
    title: 'Tư vấn 24/7',
    description: 'Đội ngũ kỹ thuật viên hỗ trợ tư vấn Build PC chuyên sâu.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M9 9h2" />
        <path d="M9 13h2" />
        <path d="M13 9h2" />
        <path d="M13 13h2" />
      </svg>
    ),
  },
];

export function FeatureGrid() {
  return (
    <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col items-center gap-3 rounded-xl p-4 text-center transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
              {feature.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
