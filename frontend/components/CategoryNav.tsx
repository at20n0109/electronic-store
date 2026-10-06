import Link from 'next/link';
import type { Category } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  cpu: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  gpu: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  mainboard: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  ram: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  storage: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  psu: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  case: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  cooling: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  laptop: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  monitor: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-600',
  peripheral: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  network: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  software: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

export function CategoryNav({ categories }: { categories: Category[] }) {
  return (
    <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/san-pham?category=${cat.slug}`}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-600/20 dark:hover:text-red-400"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                  CATEGORY_COLORS[cat.slug] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {(cat.name ?? 'LK').charAt(0)}
              </span>
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
