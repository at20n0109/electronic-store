'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { ResponsiveImage } from '@/components/ResponsiveImage';
import {
  createProduct,
  deleteProduct,
  formatVND,
  getAdminProducts,
  getCategories,
  updateProduct,
} from '@/lib/api';
import type { ProductInput } from '@/lib/api';
import type { Category, Product } from '@/lib/types';

const STATUS_LABELS: Record<Product['status'], string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Nháp',
  HIDDEN: 'Đã ẩn',
};

const STATUS_CLASS: Record<Product['status'], string> = {
  ACTIVE:
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  HIDDEN: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

const EMPTY_FORM: ProductInput = {
  sku: '',
  name: '',
  description: '',
  price: 0,
  stock: 0,
  categoryId: '',
  images: [],
};

const inputClass =
  'h-10 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState('');

  const load = useCallback(async (term?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (term) params.set('search', term);
      const res = await getAdminProducts(params);
      setProducts(res.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sản phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [res, cats] = await Promise.all([
          getAdminProducts(new URLSearchParams({ limit: '100' })),
          getCategories(),
        ]);
        if (!active) return;
        setProducts(res.data);
        setCategories(cats);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Không tải được sản phẩm',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageUrl('');
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      stock: product.stock,
      categoryId: product.category?.id ?? '',
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.alt ?? undefined,
      })),
    });
    setImageUrl(product.images[0]?.url ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageUrl('');
  }

  async function onSubmit() {
    setBusy(true);
    setError('');
    try {
      const payload: ProductInput = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: form.categoryId || null,
        images: imageUrl
          ? [{ url: imageUrl, alt: form.name || undefined }]
          : undefined,
      };
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      closeForm();
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu sản phẩm thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(product: Product) {
    if (
      !window.confirm(
        `Xoá sản phẩm "${product.name}"? Hành động này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await deleteProduct(product.id);
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xoá sản phẩm thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Quản lý sản phẩm
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          + Thêm sản phẩm
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(search);
        }}
        className="mt-5 flex gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên / SKU..."
          className={`flex-1 ${inputClass}`}
        />
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Tìm
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">SKU</span>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Tên sản phẩm
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Giá (VND)
              </span>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Tồn kho</span>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Danh mục</span>
              <select
                value={form.categoryId ?? ''}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className={inputClass}
              >
                <option value="">— Không chọn —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Mô tả</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Ảnh (URL)
            </span>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/images/photos/... hoặc tải ảnh lên"
              className={inputClass}
            />
            <ImageUploader onUpload={setImageUrl} />
            {imageUrl && (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <ResponsiveImage
                    src={imageUrl}
                    alt=""
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Xem trước ảnh sẽ lưu cho sản phẩm
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={busy}
              className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {busy ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo sản phẩm'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="h-10 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Đang tải...</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Không có sản phẩm nào.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {product.name}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[product.status]}`}
                  >
                    {STATUS_LABELS[product.status]}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono">SKU: {product.sku}</span>
                  <span>{product.category?.name ?? 'Chưa phân loại'}</span>
                  <span>Giá: {formatVND(product.price)}</span>
                  <span>Kho: {product.stock}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="h-9 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(product)}
                  disabled={busy}
                  className="h-9 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Xoá
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
