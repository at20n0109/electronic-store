"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  register,
  getAuthMethods,
  startSocialLogin,
  ApiError,
} from "../../lib/api";
import type { AuthMethods } from "../../lib/types";
import { passwordChecks, NAME_INPUT_RE } from "../../lib/password";
import {
  UserPlus,
  Lock,
  Envelope,
  CheckCircle,
  Circle,
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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [methods, setMethods] = useState<AuthMethods | null>(null);

  useEffect(() => {
    getAuthMethods()
      .then(setMethods)
      .catch(() => setMethods(null));
  }, []);

  const checks = passwordChecks(password);
  const passwordValid = Object.values(checks).every(Boolean);
  const nameValid = name.trim() === "" || NAME_INPUT_RE.test(name.trim());
  const readySocial = methods?.social.filter((m) => m.ready) ?? [];

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-red-500 dark:focus:ring-red-800";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((e.currentTarget as HTMLFormElement).reportValidity() === false) return;
    if (!passwordValid || !nameValid) return;
    setBusy(true);
    setError("");
    try {
      await register({ email, password, name: name.trim() || undefined });
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Email đã được đăng ký. Nếu đây là bạn, hãy đăng nhập.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
      }
    } finally {
      setBusy(false);
    }
  }

  const ruleItems: Array<[string, boolean]> = [
    ["Tối thiểu 8 ký tự", checks.length],
    ["Chữ thường (a-z)", checks.lower],
    ["Chữ hoa (A-Z)", checks.upper],
    ["Số (0-9)", checks.digit],
    ["Ký tự đặc biệt (!@#...)", checks.special],
  ];

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
            onChange={(e) => {
                setName(e.target.value.slice(0, 60));
                setNameTouched(true);
              }}
            placeholder="Nguyễn Văn A"
            maxLength={60}
            className={inputClass}
          />
          {!nameValid && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Họ tên chỉ được chứa chữ cái, dấu cách và dấu . - &apos;
            </p>
          )}
        </div>
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
              className={`${inputClass} pl-10`}
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
              onChange={(e) => {
                setPassword(e.target.value.slice(0, 72));
              }}
              placeholder="Tối thiểu 8 ký tự"
              required
              autoComplete="new-password"
              maxLength={72}
              className={`${inputClass} pl-10`}
            />
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {ruleItems.map(([label, ok]) => (
              <li
                key={label}
                className={`flex items-center gap-1.5 text-xs ${
                  ok
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {ok ? <CheckCircle size={13} /> : <Circle size={13} />}
                {label}
              </li>
            ))}
          </ul>
        </div>
<button
          type="submit"
          disabled={busy || !passwordValid}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:bg-zinc-400 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed dark:focus:ring-offset-zinc-900"
        >
          {busy ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>

      {readySocial.length > 0 && (
        <div className="mt-8">
          <div className="relative mb-5 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-zinc-200 dark:border-zinc-700" />
            <span className="relative bg-white px-3 text-xs text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
              Hoặc đăng ký bằng
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
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-semibold text-red-600 hover:text-red-500 dark:text-red-400"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}