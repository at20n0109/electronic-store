"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../lib/api";
import { UserPlus, Lock, Envelope } from "@phosphor-icons/react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register({ email, password, name });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white">
          <UserPlus size={28} />
        </div>
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Tạo tài khoản
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Đăng ký để mua sắm và quản lý đơn hàng
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
            Họ và tên (không bắt buộc)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-red-500 dark:focus:ring-red-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <div className="relative">
            <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              required
              className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-red-500 dark:focus:ring-red-800"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          {busy ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>
    </div>
  );
}
