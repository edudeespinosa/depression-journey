"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(t("errorMessage"));
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/dashboard`), 2000);
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Phantom Prophet"
            width={832}
            height={1248}
            className="w-28 h-auto mb-2"
            priority
            unoptimized
          />
          <h1 className="text-lg font-semibold text-[#2D3B35] mt-2">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#7C9082]/10 flex items-center justify-center">
              <svg aria-hidden="true" focusable="false" className="w-6 h-6 text-[#7C9082]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#2D3B35]">{t("successTitle")}</p>
            <p className="text-xs text-slate-400">{t("successBody")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs text-slate-500 mb-1">
                {t("passwordLabel")}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white
                           text-[#3E4A3D] placeholder:text-slate-300
                           focus:outline-none focus:ring-1 focus:ring-[#7C9082] transition"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs text-slate-500 mb-1">
                {t("confirmPasswordLabel")}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white
                           text-[#3E4A3D] placeholder:text-slate-300
                           focus:outline-none focus:ring-1 focus:ring-[#7C9082] transition"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7C9082] text-white py-2.5 rounded-lg text-sm font-medium
                         hover:bg-[#6A7C70] disabled:opacity-50 transition"
            >
              {loading ? t("loading") : t("submitButton")}
            </button>
          </form>
        )}

      </div>
    </main>
  );
}
