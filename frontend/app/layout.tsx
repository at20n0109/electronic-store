import Link from "next/link";
import "./globals.css";
import "@fontsource-variable/saira";
import "@fontsource-variable/jetbrains-mono";
import { CartProvider } from "@/context/CartContext";
import { CartDrawer, CartToggle } from "@/components/CartDrawer";
import { AccountButton } from "@/components/AccountButton";
import { MidAutumnPromo } from "@/components/promo/MidAutumnBanner";

export const metadata = {
  title: "PC Store - Linh kiện máy tính",
  description:
    "Cửa hàng linh kiện máy tính: CPU, GPU, Mainboard, RAM, Ổ cứng, Nguồn, Vỏ máy, Tản nhiệt.",
};

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CartIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
        <CartProvider>
        <header className="sticky top-0 z-50 border-b-2 border-red-600 bg-zinc-950 text-zinc-100 shadow-md">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-xl font-bold text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </span>
              PC<span className="text-red-500">Store</span>
            </Link>
            <form
              action="/san-pham"
              className="hidden h-11 flex-1 items-center overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-zinc-700 focus-within:ring-2 focus-within:ring-red-500 md:flex"
            >
              <input
                type="search"
                name="search"
                placeholder="Bạn tìm gì hôm nay?  (CPU, VGA, RAM...)"
                className="h-full w-full bg-transparent px-4 text-sm text-zinc-100 placeholder-zinc-400 outline-none"
              />
              <button
                type="submit"
                className="flex h-full w-12 shrink-0 items-center justify-center bg-red-600 text-white transition-colors hover:bg-red-500"
                aria-label="Tìm kiếm"
              >
                <SearchIcon size={18} />
              </button>
            </form>
            <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
              <Link
                href="/pc-builds"
                className="text-zinc-300 transition-colors hover:text-red-400"
              >
                Build PC
              </Link>
              <Link
                href="/san-pham?category=laptop"
                className="text-zinc-300 transition-colors hover:text-red-400"
              >
                Laptop
              </Link>
              <Link
                href="/san-pham?category=monitor"
                className="text-zinc-300 transition-colors hover:text-red-400"
              >
                Màn hình
              </Link>
            </nav>
            <div className="flex items-center gap-3">
<a
                  href="tel:xxxxxxxxxxx"
                  className="hidden items-center gap-2 text-sm font-semibold text-amber-400 lg:flex"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  xxxxxxxxxxx
                </a>
              <AccountButton />
              <CartToggle />
            </div>
          </div>
        </header>

        <MidAutumnPromo />

        <div className="border-b border-zinc-200 bg-zinc-950 dark:border-zinc-800">
          <div className="mx-auto flex h-10 max-w-7xl items-center gap-4 overflow-x-auto px-4 text-xs font-semibold uppercase tracking-wide text-zinc-300">
            <Link href="/san-pham?category=cpu" className="shrink-0 hover:text-red-400">CPU</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=gpu" className="shrink-0 hover:text-red-500">GPU</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=mainboard" className="shrink-0 hover:text-red-500">Mainboard</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=ram" className="shrink-0 hover:text-red-500">RAM</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=storage" className="shrink-0 hover:text-red-500">Ổ cứng</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=psu" className="shrink-0 hover:text-red-500">Nguồn</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=case" className="shrink-0 hover:text-red-500">Vỏ máy</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=cooling" className="shrink-0 hover:text-red-500">Tản nhiệt</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=monitor" className="shrink-0 hover:text-red-500">Màn hình</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=laptop" className="shrink-0 hover:text-red-500">Laptop</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/san-pham?category=peripheral" className="shrink-0 hover:text-red-500">Phụ kiện</Link>
          </div>
        </div>

        <main className="flex flex-1 flex-col">{children}</main>

        <CartDrawer />
        </CartProvider>

        <footer className="border-t border-zinc-200 bg-zinc-950 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto w-full max-w-7xl px-4 py-10">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Link href="/" className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M9 21V9" />
                    </svg>
                  </span>
                  PC<span className="text-red-500">Store</span>
                </Link>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Cửa hàng linh kiện máy tính &amp; Build PC chính hãng. Giá tốt, bảo hành uy tín, giao hàng nhanh.
                </p>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Danh mục</h3>
                <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <li><Link href="/san-pham?category=cpu" className="hover:text-red-500">CPU</Link></li>
                  <li><Link href="/san-pham?category=gpu" className="hover:text-red-500">GPU</Link></li>
                  <li><Link href="/san-pham?category=mainboard" className="hover:text-red-500">Mainboard</Link></li>
                  <li><Link href="/san-pham?category=ram" className="hover:text-red-500">RAM</Link></li>
                  <li><Link href="/san-pham?category=storage" className="hover:text-red-500">Ổ cứng</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Hỗ trợ</h3>
                <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <li><Link href="/" className="hover:text-red-500">Hướng dẫn mua hàng</Link></li>
                  <li><Link href="/" className="hover:text-red-500">Chính sách bảo hành</Link></li>
                  <li><Link href="/" className="hover:text-red-500">Đổi trả hàng</Link></li>
                  <li><Link href="/pc-builds" className="hover:text-red-500">Tư vấn Build PC</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Liên hệ</h3>
                <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    xx -xxx -- hcm
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    xxxxxxxxxxx
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    pcstore@gmail.com
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              © 2026 PC Store. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
