'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMe, logout } from '@/lib/api';
import type { SessionUser as MeUser } from '@/lib/types';

function UserIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogoutIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

const subscribeNoop = () => () => {};

export function AccountButton() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const me = await getMe();
        if (active) setUser(me);
      } catch {
        if (active) setUser(null);
      }
    }
    load();
    const onAuth = () => load();
    window.addEventListener('pcstore:auth', onAuth);
    return () => {
      active = false;
      window.removeEventListener('pcstore:auth', onAuth);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
    } catch {
      // cookies / local token may already be gone
    }
    setUser(null);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  const label = user ? user.name || user.email.split('@')[0] : 'Đăng nhập';

  if (!mounted) {
    return <div className="flex h-10 items-center gap-2 rounded-lg px-2" />;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors hover:bg-zinc-800 data-open:bg-zinc-800"
      >
        <span className={user ? "text-amber-400" : "text-zinc-300"}>
          <UserIcon />
        </span>
        <span className={user ? "max-w-[110px] truncate text-amber-400" : "text-zinc-300"}>
          {label}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
        >
          {user ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600 text-white">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-8 w-8 object-cover"
                    />
                  ) : (
                    <UserIcon size={16} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-100">
                    {user.name || "Khách hàng"}
                  </span>
                  <span className="block truncate text-xs text-zinc-400">
                    {user.phone || user.email}
                  </span>
                </span>
              </div>
              <div className="my-1 border-t border-zinc-700" />
              {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                <div className="pb-1">
                  <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Quản trị
                  </p>
                  <Link
                    role="menuitem"
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  >
                    <UserIcon size={16} />
                    Bảng điều khiển
                  </Link>
                  <Link
                    role="menuitem"
                    href="/admin/orders"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  >
                    <UserIcon size={16} />
                    Quản lý đơn hàng
                  </Link>
                  <Link
                    role="menuitem"
                    href="/admin/products"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  >
                    <UserIcon size={16} />
                    Quản lý sản phẩm
                  </Link>
                  <Link
                    role="menuitem"
                    href="/admin/atm"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  >
                    <UserIcon size={16} />
                    Duyệt giao dịch ATM
                  </Link>
                  <div className="my-1 border-t border-zinc-700" />
                </div>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                disabled={busy}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
              >
                <LogoutIcon />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                role="menuitem"
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 hover:text-red-400"
              >
                <UserIcon size={16} />
                Đăng nhập
              </Link>
              <Link
                role="menuitem"
                href="/register"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-red-400"
              >
                <UserIcon size={16} />
                Đăng ký tài khoản
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}