import Link from 'next/link';
import Image from 'next/image';
import { BomMarquee } from '@/components/landing/BomMarquee';
import {
  LandingHeroDiagram,
  type DiagramPart,
} from '@/components/landing/LandingHeroDiagram';
import {
  formatVND,
  getCategories,
  getPcBuilds,
  getProductBySlug,
} from '@/lib/api';
import { getProductPhoto } from '@/lib/photos';
import type { Category, PcBuild, Product } from '@/lib/types';

const BTN_PRIMARY =
  'inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-red-600 px-6 font-display text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_0_#7f1d1d] transition-all duration-150 hover:-translate-y-px hover:bg-red-500 active:translate-y-[2px] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950';

const BTN_GHOST =
  'inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-zinc-700 px-6 font-display text-base font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_0_#3f3f46] transition-all duration-150 hover:-translate-y-px hover:border-zinc-500 hover:text-white active:translate-y-[2px] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950';

const FEATURED_SLUGS = [
  'gpu-rtx4070-12g',
  'cpu-r7-7800x3d',
  'ssd-wd850-1tb',
  'mb-b650-aorus',
  'psu-rm850-g',
];

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

function SectionHeading({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-10 grid gap-3 md:grid-cols-2 md:items-end">
      <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-100 md:text-4xl">
        {title}
      </h2>
      <p className="font-display text-base leading-relaxed text-zinc-400 md:justify-self-end md:text-right md:max-w-[34ch]">
        {sub}
      </p>
    </div>
  );
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let builds: PcBuild[] = [];
  let categories: Category[] = [];
  const featured: Product[] = [];

  try {
    const [buildsRes, categoriesRes] = await Promise.all([
      getPcBuilds(),
      getCategories(),
    ]);
    builds = buildsRes;
    categories = categoriesRes;
  } catch {
    builds = [];
    categories = [];
  }

  for (const slug of FEATURED_SLUGS) {
    try {
      const product = await getProductBySlug(slug);
      if (product) featured.push(product);
    } catch {
      // skip missing slug
    }
  }

  const pc10 = builds.find((build) => build.slug === 'pc-10-trieu') ?? builds[0];
  const diagramParts: DiagramPart[] = pc10
    ? pc10.items.flatMap((item) => {
        const photo = getProductPhoto(item.product);
        if (!photo) return [];
        return [
          {
            slot: item.slot,
            code: item.product.slug,
            name: item.product.name,
            price: formatVND(item.product.price),
            photoSrc: photo.src,
            photoAlt: photo.alt,
          },
        ];
      })
    : [];

  const categoryCells = [
    ...(categories ?? []).map((cat) => ({
      name: cat.name,
      href: `/san-pham?category=${cat.slug}`,
    })),
    { name: 'Tất cả sản phẩm', href: '/san-pham' },
  ];

  return (
    <div className="flex-1 bg-zinc-950 font-display text-zinc-100">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(228,228,231,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(228,228,231,0.05) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-14 pb-12 md:pt-20">
          <div className="grid items-start gap-10 md:grid-cols-[1fr_0.92fr] md:gap-12">
            <div>
              <h1 className="font-display text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.03em] text-zinc-50 sm:text-5xl lg:text-6xl">
                Linh kiện chính hãng.
                <br />
                Ráp chuẩn mới giao.
              </h1>
              <p className="mt-6 max-w-[44ch] font-display text-lg leading-relaxed text-zinc-400">
                Bốn cấu hình mẫu đã lo xong tương thích — phần rời chính hãng,
                có ảnh chụp thật tại kho.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/pc-builds" className={BTN_PRIMARY}>
                  Xem 4 cấu hình mẫu
                </Link>
                <Link href="/san-pham" className={BTN_GHOST}>
                  Mở cửa hàng
                </Link>
              </div>
              {pc10 && (
                <p className="mt-8 flex items-center gap-2 font-data text-sm font-medium uppercase tracking-[0.14em] text-zinc-300">
                  <span className="inline-block h-1.5 w-1.5 bg-red-600" />
                  pc-10 · {pc10.items.length} món · {formatVND(pc10.total)}
                </p>
              )}
            </div>

            <div>
              <LandingHeroDiagram
                parts={diagramParts}
                total={pc10 ? formatVND(pc10.total) : '—'}
              />
            </div>
          </div>
        </div>
      </section>

      <BomMarquee />

      {/* BUILDS */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 md:py-24">
        <SectionHeading
          title="Bốn bản vẽ ngân sách."
          sub="Giá từng món là số thật trong kho. Chọn bản vẽ, tự ráp hoặc để shop lo."
        />
        <div className="grid gap-px overflow-hidden border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
          {builds.map((build, index) => {
            const flagship = index === builds.length - 1;
            return (
              <Link
                key={build.id}
                href={`/pc-builds/${build.slug}`}
                className={`group flex flex-col bg-zinc-900 p-6 transition-colors duration-200 hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600 ${
                  flagship ? 'border-t-2 border-red-600' : ''
                }`}
              >
                <div className="flex items-center justify-between font-data text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <span className="font-data text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                    pc {build.tier}tr
                  </span>
                  <span className="font-data text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                    {build.items.length} món
                  </span>
                </div>
                <p className="mt-6 font-display text-lg font-medium text-zinc-100">
                  {build.tagline}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {build.items.map((item) => (
                    <span
                      key={item.slot}
                      className="font-data text-xs font-semibold uppercase tracking-[0.1em] text-zinc-300"
                    >
                      {item.product.slug.split('-').slice(0, 2).join('-')}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-end justify-between border-t border-zinc-800 pt-5">
                  <span className="font-data text-xl font-semibold text-zinc-50">
                    {formatVND(build.total)}
                  </span>
                  <span className="flex items-center gap-1.5 font-display text-sm font-medium text-zinc-500 transition-colors group-hover:text-zinc-200">
                    Bản vẽ
                    <ArrowIcon />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-t border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:py-24">
          <SectionHeading
            title="Tám ngăn kho."
            sub="Lọc đúng ngăn, không cần đoán đường tìm."
          />
          <div className="grid gap-px overflow-hidden border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
            {categoryCells.map((cell) => (
              <Link
                key={cell.name}
                href={cell.href}
                className="group flex items-center justify-between gap-4 bg-zinc-900 px-6 py-5 transition-colors duration-200 hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600"
              >
                <span className="font-display text-base font-medium text-zinc-200 transition-colors group-hover:text-white">
                  {cell.name}
                </span>
                <span className="text-zinc-600 transition-colors group-hover:text-red-600">
                  <ArrowIcon />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PARTS */}
      {featured.length > 0 && (
        <section className="border-t border-zinc-800">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 md:py-24">
            <SectionHeading
              title="Trên kệ, đúng hàng."
              sub="Ảnh linh kiện chụp thật — không ảnh minh họa, không số ảo."
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {featured.map((product) => {
                const photo = getProductPhoto(product);
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    <div className="relative aspect-[4/3] border border-zinc-800 bg-zinc-950">
                      {photo ? (
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          fill
                          sizes="(max-width: 640px) 50vw, 20vw"
                          className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center font-data text-[10px] uppercase tracking-widest text-zinc-600">
                          no-photo
                        </span>
                      )}
                      <span className="absolute right-0 top-0 h-px w-full bg-zinc-800 transition-colors group-hover:bg-red-600" />
                    </div>
                    <p className="mt-3 truncate text-sm text-zinc-300 transition-colors group-hover:text-white">
                      {product.name}
                    </p>
                    <p className="mt-1 font-data text-base font-semibold text-zinc-50">
                      {formatVND(product.price)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CLOSING */}
      <section className="border-t border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center md:py-28">
          <h2 className="mx-auto max-w-[22ch] font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50 md:text-5xl">
            Cần con số, không cần lời chào.
          </h2>
          <p className="mt-6 font-data text-sm font-medium uppercase tracking-[0.16em] text-zinc-300">
            {builds.length} cấu hình mẫu · {categories.length} danh mục · 30+
            SKU chính hãng · bảo hành theo hãng
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/san-pham" className={BTN_PRIMARY}>
              Xem bảng giá
            </Link>
            <Link href="/pc-builds" className={BTN_GHOST}>
              Nhờ shop lo build
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}