'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMe, logout } from '@/lib/api';

type MeUser = { id: string; email: string; name: string | null; role: string };

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

export function AccountButton() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
    } catch {
      // cookies / local token may already be gone
    }
    setUser(null);
    setBusy(false);
    router.refresh();
  }

  if (!mounted) {
    return <div className="flex h-10 w-10 items-center justify-center rounded-lg" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          title="Đăng xuất"
          aria-label="Đăng xuất"
          className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-zinc-800 hover:text-amber-300 disabled:opacity-50"
        >
          <LogoutIcon />
        </button>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-amber-400 lg:inline">
          {user.name || user.email.split('@')[0]}
        </span>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-red-400"
      aria-label="Đăng nhập"
    >
      <UserIcon />
      <span className="hidden lg:inline">Đăng nhập</span>
    </Link>
  );
}