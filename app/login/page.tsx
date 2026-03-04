"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "signin" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/journal");
      router.refresh();
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for a reset link.");
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center">
          <h1 className="text-3xl font-light tracking-tight text-[#3E4A3D]">
            Phantom Prophet
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "signin" ? "Welcome back." : "We'll send you a reset link."}
          </p>
        </div>

        <form
          onSubmit={mode === "signin" ? handleSignIn : handleForgot}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white
                         text-[#3E4A3D] placeholder:text-slate-300
                         focus:outline-none focus:ring-1 focus:ring-[#7C9082] transition"
            />
          </div>

          {mode === "signin" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Password</label>
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

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {message && (
            <p className="text-sm text-[#7C9082]">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C9082] text-white py-2.5 rounded-lg text-sm
                       hover:bg-[#6A7C70] disabled:opacity-50 transition"
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
              ? "Sign in"
              : "Send reset link"}
          </button>
        </form>

        <div className="text-center text-sm">
          {mode === "signin" ? (
            <button
              onClick={() => { setMode("forgot"); setError(""); }}
              className="text-slate-400 hover:text-[#7C9082] transition"
            >
              Forgot password?
            </button>
          ) : (
            <button
              onClick={() => { setMode("signin"); setError(""); setMessage(""); }}
              className="text-slate-400 hover:text-[#7C9082] transition"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
