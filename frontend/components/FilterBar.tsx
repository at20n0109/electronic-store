'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Category } from '@/lib/types';

type SortOption = 'price_asc' | 'price_desc' | 'name_asc' | 'newest';

type FilterBarProps = {
  categories: Category[];
  search: string;
  category: string;
  sort: SortOption;
  priceMin?: string;
  priceMax?: string;
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'name_asc', label: 'Tên A → Z' },
];

const PRICE_RANGES = [
  { value: '0-500000', label: 'Dưới 500K' },
  { value: '500000-2000000', label: '500K - 2 triệu' },
  { value: '2000000-5000000', label: '2 - 5 triệu' },
  { value: '5000000-99999999', label: 'Trên 5 triệu' },
];

const SELECT_CLASS =
  'h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-red-500 dark:focus:ring-red-800';

export function FilterBar({
  categories,
  search,
  category,
  sort,
  priceMin,
  priceMax,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const current: Record<string, string> = {};
  if (search) current.search = search;
  if (category) current.category = category;
  if (sort) current.sort = sort;
  if (priceMin) current.minPrice = priceMin;
  if (priceMax) current.maxPrice = priceMax;

  const urlFor = (updates: Record<string, string>) => {
    const merged = { ...current, ...updates };
    const params = new URLSearchParams();
    for (const key of Object.keys(merged)) {
      if (merged[key]) params.set(key, merged[key]);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const navigate = (updates: Record<string, string>) => {
    router.push(urlFor(updates));
  };

  const activePrice =
    priceMin && priceMax ? `${priceMin}-${priceMax}` : '';

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-1 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const input = new FormData(event.currentTarget).get('search');
          navigate({ search: String(input ?? '').trim() });
        }}
      >
        <input
          name="search"
          type="search"
          key={search}
          defaultValue={search}
          placeholder="Tìm kiếm linh kiện..."
          className="h-11 flex-1 rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-red-500 dark:focus:ring-red-800"
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          Tìm
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Danh mục
        </label>
        <select
          value={category}
          onChange={(event) => navigate({ category: event.target.value })}
          className={SELECT_CLASS}
        >
          <option value="">Tất cả</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>

        <label className="ml-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Sắp xếp
        </label>
        <select
          value={sort}
          onChange={(event) => navigate({ sort: event.target.value })}
          className={SELECT_CLASS}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <details className="group relative ml-2">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-600 transition-colors hover:border-red-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-red-500">
            {activePrice
              ? PRICE_RANGES.find((r) => r.value === activePrice)?.label ??
                'Lọc giá'
              : 'Lọc giá'}
          </summary>
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {PRICE_RANGES.map((range) => {
              const [min, max] = range.value.split('-');
              const isActive = activePrice === range.value;
              return (
                <Link
                  key={range.value}
                  href={urlFor(
                    isActive
                      ? { minPrice: '', maxPrice: '' }
                      : { minPrice: min, maxPrice: max },
                  )}
                  className={`block px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                    isActive
                      ? 'font-semibold text-red-600'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {range.label}
                  {isActive ? ' ✓' : ''}
                </Link>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}