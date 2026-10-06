import Link from 'next/link';
import Image from 'next/image';
import { getPcBuilds } from '@/lib/api';
import { formatVND } from '@/lib/api';
import { SLOT_ICONS, SLOT_LABELS } from '@/lib/pcbuild';
import { getProductPhoto } from '@/lib/photos';
import { PcBuildHover } from '@/components/PcBuildHover';
import type { PcBuild } from '@/lib/types';

export const metadata = {
  title: 'Cấu hình PC theo ngân sách - PC Store',
  description:
    'Gợi ý cấu hình PC hoàn chỉnh các phân khúc 10, 20, 30 và 40 triệu đồng - linh kiện chính hãng, giá minh bạch.',
};

const TIER_STYLES: Record<number, { badge: string; ring: string }> = {
  10: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    ring: 'hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  20: {
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    ring: 'hover:border-sky-300 dark:hover:border-sky-700',
  },
  30: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    ring: 'hover:border-amber-300 dark:hover:border-amber-700',
  },
  40: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    ring: 'hover:border-red-300 dark:hover:border-red-700',
  },
};

function BuildImage({ build }: { build: PcBuild }) {
  const caseItem = build.items.find((item) => item.slot === 'case');
  const photo = caseItem ? getProductPhoto(caseItem.product) : undefined;

  if (!photo) return null;

  return (
    <div className="relative mb-4 h-40 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(max-width: 1024px) 50vw, 320px"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}

export default async function PcBuildsPage() {
  const builds = await getPcBuilds();

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:py-12">
      <div className="mb-8 max-w-2xl">
        <span className="inline-block rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Build PC gợi ý
        </span>
        <h1 className="mt-3 font-heading text-2xl font-bold text-zinc-900 md:text-3xl dark:text-zinc-50">
          Cấu hình PC theo ngân sách
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 md:text-base dark:text-zinc-400">
          4 cấu hình hoàn chỉnh từ 10 đến 40 triệu - đã kiểm tra tương thích,
          giá và tồn kho cập nhật trực tiếp từ kho. Tự do đổi linh kiện ngay
          trên trang chi tiết.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {builds.map((build) => {
          const style = TIER_STYLES[build.tier] ?? TIER_STYLES[10];
          const outOfStock = build.items.filter(
            (item) => item.product.stock <= 0,
          ).length;
          const pct = Math.min(
            100,
            Math.round((build.total / build.budget) * 100),
          );

          return (
            <PcBuildHover key={build.id} build={build}>
              <Link
                href={`/pc-builds/${build.slug}`}
                className={`group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${style.ring}`}
              >
              <BuildImage build={build} />
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`rounded-lg px-2.5 py-1 text-sm font-bold ${style.badge}`}
                >
                  {build.tier} triệu
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {build.items.length} linh kiện
                </span>
              </div>

              <h2 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-red-600 dark:text-zinc-50 dark:group-hover:text-red-400">
                {build.name}
              </h2>
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {build.tagline}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {build.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {build.items.map((item) => (
                  <span
                    key={item.slot}
                    title={SLOT_LABELS[item.slot]}
                    className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {SLOT_ICONS[item.slot] ?? item.slot}
                  </span>
                ))}
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-zinc-400">Tổng cộng</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatVND(build.total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-zinc-400">Ngân sách</p>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatVND(build.budget)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span
                    className={
                      build.remaining >= 0
                        ? 'font-medium text-emerald-600 dark:text-emerald-400'
                        : 'font-semibold text-red-600'
                    }
                  >
                    {build.remaining >= 0
                      ? `Còn ${formatVND(build.remaining)}`
                      : `Vượt ${formatVND(Math.abs(build.remaining))}`}
                  </span>
                  {outOfStock > 0 ? (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {outOfStock} món hết hàng
                    </span>
                  ) : (
                    <span className="font-medium text-zinc-400">
                      Còn hàng
                    </span>
                  )}
                </div>
              </div>

              <span className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition-colors group-hover:bg-red-600 dark:bg-zinc-800">
                Xem &amp; tùy chọn cấu hình
              </span>
              </Link>
            </PcBuildHover>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-heading text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Cấu hình hoạt động như thế nào?
        </h2>
        <ul className="mt-3 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3 dark:text-zinc-400">
          <li className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <strong className="block text-zinc-900 dark:text-zinc-100">
              1. Chọn phân khúc
            </strong>
            Bấm vào cấu hình phù hợp ngân sách của bạn.
          </li>
          <li className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <strong className="block text-zinc-900 dark:text-zinc-100">
              2. Tùy chỉnh linh kiện
            </strong>
            Đổi từng linh kiện, xem so sánh thông số và cảnh báo tương thích
            realtime.
          </li>
          <li className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <strong className="block text-zinc-900 dark:text-zinc-100">
              3. Thêm cả bộ vào giỏ
            </strong>
            Giá và tồn kho lấy trực tiếp từ kho, không phát sinh phí ẩn.
          </li>
        </ul>
      </div>
    </div>
  );
}
