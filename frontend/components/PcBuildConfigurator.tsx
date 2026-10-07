'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PcBuildDetail, PcBuildItem, Product } from '@/lib/types';
import { formatVND } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import {
  SLOT_ICONS,
  SLOT_LABELS,
  checkCompatibility,
  getRecommendations,
} from '@/lib/pcbuild';

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        Hết hàng
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        Còn {stock}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      Còn {stock}
    </span>
  );
}

function deltaBadge(delta: number) {
  if (delta === 0) {
    return (
      <span className="text-[11px] font-medium text-zinc-400">cùng giá</span>
    );
  }
  const cls =
    delta > 0
      ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${cls}`}>
      {delta > 0 ? '+' : '−'}
      {formatVND(Math.abs(delta))}
    </span>
  );
}

function compareKeys(current: Product, alt: Product): string[] {
  const keys = Object.keys(alt.specs ?? {});
  const shared = keys.filter((key) => current.specs?.[key]);
  return shared.slice(0, 4);
}

export function PcBuildConfigurator({ build }: { build: PcBuildDetail }) {
  const { addItems } = useCart();

  const defaults = useMemo(
    () =>
      Object.fromEntries(
        build.items.map((item) => [item.slot, item.product.id]),
      ) as Record<string, string>,
    [build.items],
  );

  const [selected, setSelected] = useState<Record<string, string>>(defaults);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [onlyAffordable, setOnlyAffordable] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  const catalog = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const item of build.items) {
      const alternatives = build.alternatives[item.slot] ?? [];
      map[item.slot] = [
        item.product,
        ...alternatives.filter((product) => product.id !== item.product.id),
      ];
    }
    return map;
  }, [build]);

  const items: PcBuildItem[] = useMemo(
    () =>
      build.items.map((item) => {
        const pool = catalog[item.slot] ?? [item.product];
        const product =
          pool.find((candidate) => candidate.id === selected[item.slot]) ??
          item.product;
        return { slot: item.slot, sortOrder: item.sortOrder, product };
      }),
    [build.items, catalog, selected],
  );

  const total = items.reduce((sum, item) => sum + item.product.price, 0);
  const remaining = build.budget - total;
  const issues = useMemo(() => checkCompatibility(items), [items]);
  const recommendations = useMemo(
    () => getRecommendations(items, build.alternatives, build.budget),
    [items, build.alternatives, build.budget],
  );
  const outOfStock = items.filter((item) => item.product.stock <= 0);
  const pct = Math.min(100, Math.round((total / build.budget) * 100));
  const isCustomized = items.some(
    (item) => selected[item.slot] !== defaults[item.slot],
  );

  function swap(slot: string, productId: string) {
    setSelected((prev) => ({ ...prev, [slot]: productId }));
  }

  function restore() {
    setSelected(defaults);
    setAddMsg(null);
  }

  async function addAll() {
    setAdding(true);
    setAddMsg(null);
    const inStock = items.filter((item) => item.product.stock > 0);
    const skipped = items.length - inStock.length;
    try {
      await addItems(inStock.map((item) => item.product.id));
      setAddMsg(
        `Đã thêm ${inStock.length} linh kiện vào giỏ hàng${
          skipped > 0 ? ` (bỏ qua ${skipped} món hết hàng)` : ''
        }.`,
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-3">
        {remaining < 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <strong className="font-semibold">Vượt ngân sách{' '}
              {formatVND(Math.abs(remaining))}</strong>{' '}
            - xem gợi ý bên phải để tìm linh kiện thay thế rẻ hơn.
          </div>
        )}

        {issues.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="mb-1 font-semibold">Cảnh báo tương thích:</p>
            <ul className="list-inside list-disc space-y-0.5">
              {issues.map((issue) => (
                <li key={issue.slot + issue.message}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {items.map((item) => {
          const slotLabel = SLOT_LABELS[item.slot] ?? item.slot;
          const expanded = expandedSlot === item.slot;
          const pool = catalog[item.slot] ?? [];
          const alternatives = pool.filter(
            (product) => product.id !== item.product.id,
          );
          const visibleAlternatives = alternatives.filter((product) => {
            if (!onlyAffordable) return true;
            return total - item.product.price + product.price <= build.budget;
          });
          const issueForSlot = issues.some(
            (issue) => issue.slot === item.slot,
          );

          return (
            <div
              key={item.slot}
              className={`overflow-hidden rounded-2xl border bg-white transition-colors dark:bg-zinc-900 ${
                issueForSlot
                  ? 'border-amber-300 dark:border-amber-800'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedSlot(expanded ? null : item.slot)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                aria-expanded={expanded}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-[10px] font-bold uppercase text-white dark:bg-zinc-800">
                  {SLOT_ICONS[item.slot] ?? item.slot}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                    {slotLabel}
                  </span>
                  <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {item.product.name}
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {formatVND(item.product.price)}
                  </span>
                  <StockBadge stock={item.product.stock} />
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {expanded && (
                <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Đang chọn
                    </p>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={onlyAffordable}
                        onChange={(event) =>
                          setOnlyAffordable(event.target.checked)
                        }
                        className="h-3.5 w-3.5 accent-red-600"
                      />
                      Chỉ hiện mục vừa ngân sách
                    </label>
                  </div>

                  <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.product.name}
                      </p>
                      <span className="shrink-0 text-sm font-bold text-red-600">
                        {formatVND(item.product.price)}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(item.product.specs ?? {})
                        .slice(0, 4)
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-baseline justify-between gap-2 text-xs"
                          >
                            <dt className="truncate text-zinc-400">{key}</dt>
                            <dd className="shrink-0 font-medium text-zinc-700 dark:text-zinc-200">
                              {value}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </div>

                  {visibleAlternatives.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      Không có lựa chọn thay thế phù hợp ngân sách còn lại.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {visibleAlternatives.map((product) => {
                        const delta = product.price - item.product.price;
                        const futureTotal =
                          total - item.product.price + product.price;
                        const fits = futureTotal <= build.budget;
                        const keys = compareKeys(item.product, product);

                        return (
                          <li
                            key={product.id}
                            className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                  {product.name}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-red-600">
                                    {formatVND(product.price)}
                                  </span>
                                  {deltaBadge(delta)}
                                  <StockBadge stock={product.stock} />
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                                      fits
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                    }`}
                                  >
                                    {fits
                                      ? `Vẫn còn ${formatVND(build.budget - futureTotal)}`
                                      : `Vượt ${formatVND(futureTotal - build.budget)}`}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={product.stock <= 0}
                                onClick={() => swap(item.slot, product.id)}
                                className="shrink-0 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-red-600"
                              >
                                {selected[item.slot] === product.id
                                  ? 'Đang chọn'
                                  : 'Chọn'}
                              </button>
                            </div>

                            {keys.length > 0 && (
                              <table className="mt-2 w-full text-xs">
                                <tbody>
                                  {keys.map((key) => (
                                    <tr
                                      key={key}
                                      className="border-t border-zinc-100 dark:border-zinc-800"
                                    >
                                      <td className="w-1/3 py-1 pr-2 text-zinc-400">
                                        {key}
                                      </td>
                                      <td className="py-1 text-zinc-500 line-through dark:text-zinc-500">
                                        {item.product.specs?.[key]}
                                      </td>
                                      <td className="py-1 pl-2 font-medium text-zinc-800 dark:text-zinc-100">
                                        {product.specs?.[key]}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <aside className="lg:col-span-2">
        <div className="sticky top-28 flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-heading text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Tổng quan ngân sách
            </h2>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${remaining < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Tạm tính</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatVND(total)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Ngân sách
                </dt>
                <dd className="font-medium text-zinc-700 dark:text-zinc-300">
                  {formatVND(build.budget)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
                <dt className="font-medium text-zinc-600 dark:text-zinc-300">
                  {remaining >= 0 ? 'Còn lại' : 'Vượt ngân sách'}
                </dt>
                <dd
                  className={`font-bold ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}
                >
                  {formatVND(Math.abs(remaining))}
                </dd>
              </div>
            </dl>

            {outOfStock.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {outOfStock.length} linh kiện hết hàng sẽ bị bỏ qua khi thêm
                vào giỏ.
              </p>
            )}

            <button
              type="button"
              onClick={addAll}
              disabled={adding || outOfStock.length === items.length}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            >
              {adding ? 'Đang thêm vào giỏ...' : `Thêm cả bộ vào giỏ (${items.length - outOfStock.length} món)`}
            </button>

            {addMsg && (
              <p className="mt-2 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {addMsg}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={restore}
                disabled={!isCustomized || adding}
                className="text-xs font-medium text-zinc-500 underline-offset-2 transition-colors hover:text-red-600 hover:underline disabled:no-underline disabled:opacity-40 dark:text-zinc-400"
              >
                Khôi phục cấu hình gốc
              </button>
              <Link
                href="/pc-builds"
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-red-600 dark:text-zinc-400"
              >
                Xem cấu hình khác
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-heading text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Gợi ý cho bạn
            </h2>

            {recommendations.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Cấu hình hiện tại đã cân đối ngân sách và tương thích tốt.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {recommendations.map((rec, index) => (
                  <li
                    key={`${rec.kind}-${rec.slot}-${index}`}
                    className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                        {SLOT_LABELS[rec.slot] ?? rec.slot}
                      </span>
                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {rec.kind === 'compat'
                          ? 'Tương thích'
                          : rec.kind === 'downgrade'
                            ? 'Tiết kiệm'
                            : rec.kind === 'upgrade'
                              ? 'Nâng cấp'
                              : 'Bổ sung'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                      {rec.reason}
                    </p>
                    {rec.product && rec.replaceProductId && (
                      <button
                        type="button"
                        onClick={() => swap(rec.slot, rec.product!.id)}
                        disabled={rec.product.stock <= 0}
                        className="mt-2 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:border-red-500 hover:text-red-600 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300"
                      >
                        Áp dụng đề xuất
                      </button>
                    )}
                    {!rec.replaceProductId && rec.product && (
                      <Link
                        href={`/products/${rec.product.slug}`}
                        className="mt-2 inline-block text-xs font-semibold text-red-600 hover:underline"
                      >
                        Xem chi tiết →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
