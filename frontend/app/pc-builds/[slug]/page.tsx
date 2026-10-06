import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPcBuild } from '@/lib/api';
import { formatVND } from '@/lib/api';
import { PcBuildConfigurator } from '@/components/PcBuildConfigurator';

export const metadata = {
  title: 'Cấu hình PC chi tiết - PC Store',
};

function ArrowLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export default async function PcBuildDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let build;
  try {
    build = await getPcBuild(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-10">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
      >
        <Link
          href="/pc-builds"
          className="flex items-center gap-1 transition-colors hover:text-red-600"
        >
          <ArrowLeftIcon size={16} />
          Cấu hình PC
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="text-zinc-800 dark:text-zinc-200">{build.name}</span>
      </nav>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-lg bg-red-600 px-2.5 py-1 text-sm font-bold text-white">
              {build.tier} triệu
            </span>
            <h1 className="mt-3 font-heading text-2xl font-bold text-zinc-900 md:text-3xl dark:text-zinc-50">
              {build.name}
            </h1>
            <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
              {build.tagline}
            </p>
            {build.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {build.description}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-zinc-50 px-4 py-3 text-right dark:bg-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ngân sách
            </p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatVND(build.budget)}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {build.items.length} linh kiện · giá đã gồm VAT
            </p>
          </div>
        </div>
      </div>

      <PcBuildConfigurator build={build} />
    </div>
  );
}
