import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatVND, getProductBySlug } from '@/lib/api';
import { PartIllustration } from '@/components/PartIllustration';
import { AddToCartButton } from '@/components/AddToCartButton';

function ArrowLeftIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function CheckCircleIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function GiftIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect width="20" height="5" x="2" y="7" rx="2" />
      <line x1="12" x2="12" y1="22" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function ShieldIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function TruckIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="13" x="2" y="5" rx="2" />
      <path d="M16 5V3a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M22 7h-4v13h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M2 7h4v13H2a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <circle cx="7" cy="14" r="1.5" />
      <circle cx="17" cy="14" r="1.5" />
    </svg>
  );
}

function HeartIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

const SPECS_GRADIENTS: Record<string, string> = {
  cpu: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20',
  gpu: 'from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20',
  mainboard: 'from-red-600 to-red-600 dark:from-red-600/20 dark:to-red-600/20',
  ram: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
  storage: 'from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20',
  psu: 'from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800',
  case: 'from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20',
  cooling: 'from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20',
};

function specGradient(slug?: string | null) {
  return SPECS_GRADIENTS[slug ?? ''] ?? 'from-zinc-50 to-gray-50 dark:from-zinc-800 dark:to-gray-800';
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  const inStock = product.stock > 0;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="flex items-center gap-1 transition-colors hover:text-red-600 dark:hover:text-red-600">
          <ArrowLeftIcon size={16} />
          Quay lại
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        {product.category ? (
          <>
            <Link
              href={`/?category=${product.category.slug}`}
              className="transition-colors hover:text-red-600 dark:hover:text-red-600"
            >
              {product.category.name}
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
          </>
        ) : null}
        <span className="text-zinc-800 dark:text-zinc-200">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl">
            <PartIllustration
              slug={product.category?.slug}
              product={product.slug}
              className="aspect-[16/10] w-full transition-transform duration-300 hover:scale-[1.01]"
            />
          </div>
          <div className="mt-3 flex gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 ${i === 1 ? 'border-red-600' : 'border-transparent'} bg-zinc-900 transition-colors hover:border-red-600`}
              >
                {i === 1 ? (
                  <PartIllustration slug={product.category?.slug} product={product.slug} className="h-full w-full" />
                ) : (
                  <span className="text-sm font-bold text-zinc-500">{i}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          {product.category && (
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-600">
              {product.category.name}
            </span>
          )}

          <h1 className="font-heading text-xl font-bold leading-snug text-zinc-900 md:text-2xl dark:text-zinc-50">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-red-600 dark:text-red-600">
              {formatVND(product.price)}
            </span>
            <span
              className={
                inStock
                  ? 'rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-600/40 dark:text-red-600'
                  : 'rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }
            >
              {inStock ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <dl className="grid grid-cols-1 gap-2">
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Mã SKU</dt>
                <dd className="font-mono text-zinc-800 dark:text-zinc-200">{product.sku}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Trạng thái</dt>
                <dd className={inStock ? 'text-red-600 dark:text-red-600' : 'text-zinc-500 dark:text-zinc-400'}>
                  {product.status}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <AddToCartButton
              productId={product.id}
              inStock={inStock}
              className="flex-1 h-12"
            />
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-zinc-300 px-6 text-sm font-semibold text-zinc-700 transition-colors hover:border-red-600 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-600 dark:hover:text-red-600"
            >
              <HeartIcon />
              Yêu thích
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 dark:bg-red-600/20">
              <TruckIcon size={16} className="text-red-600" />
              <span className="text-xs font-medium text-red-600 dark:text-red-600">Giao nhanh 2h</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 dark:bg-red-600/20">
              <ShieldIcon size={16} className="text-red-600" />
              <span className="text-xs font-medium text-red-600 dark:text-red-600">Bảo hành</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 dark:bg-red-600/20">
              <CheckCircleIcon size={16} className="text-red-600" />
              <span className="text-xs font-medium text-red-600 dark:text-red-600">Chính hãng</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 dark:bg-red-600/20">
              <GiftIcon size={16} className="text-red-600" />
              <span className="text-xs font-medium text-red-600 dark:text-red-600">Khuyến mãi</span>
            </div>
          </div>

          {product.description && (
            <div className="mt-2">
              <h2 className="mb-2 font-heading text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Mô tả sản phẩm
              </h2>
              <p className="leading-7 text-zinc-600 dark:text-zinc-400">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <h2 className="mb-4 font-heading text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Thông số kỹ thuật
          </h2>
          <div className={`rounded-xl border border-zinc-100 ${specGradient(product.category?.slug)}`}>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Thương hiệu</td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{product.name.split(' ').slice(0, 2).join(' ')}</td>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Mã SKU</td>
                  <td className="px-4 py-3 font-mono text-zinc-900 dark:text-zinc-50">{product.sku}</td>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Tình trạng</td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{product.status}</td>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Số lượng kho</td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{product.stock}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Ngày cập nhật</td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{new Date(product.updatedAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 font-heading text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Sản phẩm liên quan
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Danh sách sản phẩm cùng danh mục sẽ được hiển thị tại đây khi có dữ liệu.
          </p>
          <Link
            href={`/?category=${product.category?.slug ?? ''}`}
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 dark:text-red-600 dark:hover:bg-red-600/30"
          >
            Xem tất cả
          </Link>
        </div>
      </div>
    </div>
  );
}
