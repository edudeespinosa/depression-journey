"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

type Mode = "signin" | "signup" | "forgot" | "verify";

export default function LoginPage() {
  const t = useTranslations("login");
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "signup") setMode("signup");
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSignIn(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(`/${locale}/dashboard`);
      router.refresh();
    }
  }

  async function handleSignUp(e: { preventDefault(): void }) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMode("verify");
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

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  if (mode === "verify") {
    return (
      <main className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#7C9082]/10 flex items-center justify-center">
              <svg aria-hidden="true" focusable="false" className="w-8 h-8 text-[#7C9082]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#2D3B35]">{t("verifyTitle")}</h1>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                {t("verifySubtitle", { email })}
              </p>
            </div>
          </div>
          <button
            onClick={() => switchMode("signin")}
            className="text-sm text-slate-400 hover:text-[#7C9082] transition"
          >
            {t("backLink")}
          </button>
        </div>
      </main>
    );
  }

  const subtitle =
    mode === "signin" ? t("subtitleSignin")
    : mode === "signup" ? t("subtitleSignup")
    : t("subtitleForgot");

  return (
    <main className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

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
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>

        {mode !== "forgot" && (
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg
                       border border-slate-200 bg-white text-sm text-[#3E4A3D] font-medium
                       hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            {t("googleButton")}
          </button>
        )}

        {mode !== "forgot" && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#FDFCF8] px-3 text-slate-300">{t("orDivider")}</span>
            </div>
          </div>
        )}

        <form
          onSubmit={
            mode === "signin" ? handleSignIn
            : mode === "signup" ? handleSignUp
            : handleForgot
          }
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-xs text-slate-500 mb-1">
              {t("emailLabel")}
            </label>
            <input
              id="email"
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

          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="block text-xs text-slate-500 mb-1">
                {t("passwordLabel")}
              </label>
              <input
                id="password"
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

          {mode === "signup" && (
            <div>
              <label htmlFor="confirmPassword" className="block text-xs text-slate-500 mb-1">
                {t("confirmPasswordLabel")}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white
                           text-[#3E4A3D] placeholder:text-slate-300
                           focus:outline-none focus:ring-1 focus:ring-[#7C9082] transition"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}
          {message && (
            <p className="text-sm text-[#7C9082]">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C9082] text-white py-2.5 rounded-lg text-sm font-medium
                       hover:bg-[#6A7C70] disabled:opacity-50 transition"
          >
            {loading
              ? t("loading")
              : mode === "signin"
              ? t("signinButton")
              : mode === "signup"
              ? t("signupButton")
              : t("sendResetButton")}
          </button>
        </form>

        <div className="text-center text-sm space-y-2">
          {mode === "signin" && (
            <>
              <div>
                <button
                  onClick={() => switchMode("signup")}
                  className="text-[#7C9082] font-medium hover:text-[#6A7C70] transition"
                >
                  {t("createAccountLink")}
                </button>
              </div>
              <div>
                <button
                  onClick={() => switchMode("forgot")}
                  className="text-slate-400 hover:text-[#7C9082] transition"
                >
                  {t("forgotLink")}
                </button>
              </div>
            </>
          )}
          {mode === "signup" && (
            <button
              onClick={() => switchMode("signin")}
              className="text-slate-400 hover:text-[#7C9082] transition"
            >
              {t("alreadyAccountLink")}
            </button>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => switchMode("signin")}
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
