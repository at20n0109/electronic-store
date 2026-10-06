import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { FilterBar } from '@/components/FilterBar';
import { CategoryNav } from '@/components/CategoryNav';
import { PageHeader } from '@/components/PageHeader';
import { buildProductQuery, getCategories, getProducts } from '@/lib/api';

const SORTS = ['price_asc', 'price_desc', 'name_asc', 'newest'] as const;

function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const first = (key: string) => {
    const value = searchParams[key];
    return typeof value === 'string' ? value : '';
  };

  const toPositive = (value: string) =>
    Number.isFinite(Number(value)) && Number(value) > 0 ? String(Number(value)) : '';

  const search = first('search');
  const category = first('category');
  const sortRaw = first('sort');
  const sort = (SORTS as readonly string[]).includes(sortRaw)
    ? (sortRaw as (typeof SORTS)[number])
    : 'newest';
  const page = Math.max(1, Number.parseInt(first('page'), 10) || 1);
  const priceMin = toPositive(first('minPrice'));
  const priceMax = toPositive(first('maxPrice'));

  return { search, category, sort, page, priceMin, priceMax };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { search, category, sort, page, priceMin, priceMax } =
    parseSearchParams(params);

  const query = buildProductQuery({
    search,
    category,
    sort,
    page,
    minPrice: priceMin ? Number(priceMin) : undefined,
    maxPrice: priceMax ? Number(priceMax) : undefined,
  });

  const [products, categories] = await Promise.all([
    getProducts(query),
    getCategories(),
  ]);

  const { data, meta } = products;

  const paginationLinks: number[] = [];
  for (let i = 1; i <= meta.totalPages; i += 1) {
    if (i === 1 || i === meta.totalPages || Math.abs(i - page) <= 2) {
      paginationLinks.push(i);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <CategoryNav categories={categories} />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="mb-6">
          <FilterBar
            categories={categories}
            search={search}
            category={category}
            sort={sort}
            priceMin={priceMin}
            priceMax={priceMax}
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <PageHeader
            title={
              category
                ? categories.find((cat) => cat.slug === category)?.name ?? 'Danh mục'
                : 'Tất cả sản phẩm'
            }
            subtitle={`${meta.total} sản phẩm`}
          />
        </div>

        {data.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-300 py-20 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-zinc-300 dark:text-zinc-600">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-base">Không tìm thấy sản phẩm phù hợp.</p>
            <p className="mt-1 text-sm">Vui lòng thử từ khóa khác hoặc chọn danh mục khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {meta.totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Phân trang">
            {paginationLinks.map((pageNumber, index) => {
              const isCurrent = pageNumber === page;
              const key = `${pageNumber}-${index}`;
              const href = `/san-pham?${buildProductQuery({
                search,
                category,
                sort,
                page: pageNumber,
                minPrice: priceMin ? Number(priceMin) : undefined,
                maxPrice: priceMax ? Number(priceMax) : undefined,
              }).toString()}`;

              if (index > 0 && pageNumber - paginationLinks[index - 1] > 1) {
                return (
                  <div key={key} className="flex items-center gap-1">
                    <span className="px-1 text-zinc-400">...</span>
                    {isCurrent ? (
                      <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-red-600 px-3 text-sm font-semibold text-white">
                        {pageNumber}
                      </span>
                    ) : (
                      <Link
                        className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-zinc-300 px-3 text-sm text-zinc-700 transition-colors hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        href={href}
                      >
                        {pageNumber}
                      </Link>
                    )}
                  </div>
                );
              }

              return isCurrent ? (
                <span key={key} className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-red-600 px-3 text-sm font-semibold text-white">
                  {pageNumber}
                </span>
              ) : (
                <Link
                  key={key}
                  className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-zinc-300 px-3 text-sm text-zinc-700 transition-colors hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  href={href}
                >
                  {pageNumber}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}