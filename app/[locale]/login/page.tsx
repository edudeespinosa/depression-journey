"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

type Mode = "signin" | "forgot";

export default function LoginPage() {
  const t = useTranslations("login");
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleSignIn(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(`/${locale}/journal`);
      router.refresh();
    }
  }

  async function handleForgot(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/auth/callback`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage(t("resetSuccessMessage"));
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center flex flex-col items-center">
          <Image src="/logo.png" alt="Phantom Prophet" width={832} height={1248} className="w-32 h-auto mb-2" priority unoptimized />
          <p className="mt-1 text-sm text-slate-400">
            {mode === "signin" ? t("subtitleSignin") : t("subtitleForgot")}
          </p>
        </div>

        <form
          onSubmit={mode === "signin" ? handleSignIn : handleForgot}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("emailLabel")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white
                         text-[#3E4A3D] placeholder:text-slate-300
                         focus:outline-none focus:ring-1 focus:ring-[#7C9082] transition"
            />
          </div>

          {mode === "signin" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t("passwordLabel")}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white
                           text-[#3E4A3D] placeholder:text-slate-300
                           focus:outline-none focus:ring-1 focus:ring-[#7C9082] transition"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-[#7C9082]">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C9082] text-white py-2.5 rounded-lg text-sm
                       hover:bg-[#6A7C70] disabled:opacity-50 transition"
          >
            {loading
              ? t("loading")
              : mode === "signin"
              ? t("signinButton")
              : t("sendResetButton")}
          </button>
        </form>

        <div className="text-center text-sm">
          {mode === "signin" ? (
            <button
              onClick={() => { setMode("forgot"); setError(""); }}
              className="text-slate-400 hover:text-[#7C9082] transition"
            >
              {t("forgotLink")}
            </button>
          ) : (
            <button
              onClick={() => { setMode("signin"); setError(""); setMessage(""); }}
              className="text-slate-400 hover:text-[#7C9082] transition"
            >
              {t("backLink")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
