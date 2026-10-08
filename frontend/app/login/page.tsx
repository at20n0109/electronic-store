"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, getAuthMethods, startSocialLogin, ApiError } from "../../lib/api";
import type { AuthMethods } from "../../lib/types";
import {
  SignIn,
  Lock,
  Envelope,
  GoogleLogo,
  FacebookLogo,
  AppleLogo,
} from "@phosphor-icons/react";

export const dynamic = "force-dynamic";

function socialIcon(provider: "google" | "facebook" | "apple") {
  if (provider === "google") return <GoogleLogo size={18} weight="bold" />;
  if (provider === "facebook") return <FacebookLogo size={18} weight="bold" />;
  return <AppleLogo size={18} weight="bold" />;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [methods, setMethods] = useState<AuthMethods | null>(null);

  useEffect(() => {
    getAuthMethods()
      .then(setMethods)
      .catch(() => setMethods(null));
  }, []);

  const readySocial = methods?.social.filter((m) => m.ready) ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login({ email, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        setError("Email hoặc mật khẩu không đúng.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white">
          <SignIn size={28} />
        </div>
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Đăng nhập
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Đăng nhập để tiếp tục mua sắm và quản lý đơn hàng
        </p>
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <Lock size={14} />
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <div className="relative">
            <Envelope
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 254))}
              placeholder="your@email.com"
              maxLength={254}
              required
              className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-red-500 dark:focus:ring-red-800"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 72))}
              placeholder="Mật khẩu của bạn"
              required
              maxLength={72}
              className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-red-500 dark:focus:ring-red-800"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          {busy ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>

      {readySocial.length > 0 && (
        <div className="mt-8">
          <div className="relative mb-5 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-zinc-200 dark:border-zinc-700" />
            <span className="relative bg-white px-3 text-xs text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
              Hoặc đăng nhập bằng
            </span>
          </div>
          <div className="grid gap-2">
            {readySocial.map((m) => (
              <button
                key={m.provider}
                type="button"
                onClick={() =>
                  startSocialLogin(m.provider).catch((err) => {
                    if (err instanceof ApiError) setError(err.message);
                    else setError("Không khởi tạo được đăng nhập.");
                  })
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {socialIcon(m.provider)}
                Tiếp tục với {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-semibold text-red-600 hover:text-red-500 dark:text-red-400"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  );
}