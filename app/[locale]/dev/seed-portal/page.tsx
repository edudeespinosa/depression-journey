"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";

type Status = "idle" | "seeding" | "clearing" | "done" | "cleared" | "error";

export default function DevSeedPortalPage() {
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function safeJson(res: Response): Promise<{ ok: boolean; error?: string }> {
    const text = await res.text();
    try {
      return { ok: res.ok, ...JSON.parse(text) };
    } catch {
      return { ok: false, error: `Server error (${res.status}): ${text.slice(0, 200)}` };
    }
  }

  async function handleSeed() {
    setStatus("seeding");
    setError("");
    try {
      const res = await fetch("/api/dev/seed-portal", { method: "POST" });
      const data = await safeJson(res);
      if (!data.ok) {
        setError(data.error ?? "Unknown error");
        setStatus("error");
      } else {
        setStatus("done");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    }
  }

  async function handleClear() {
    setStatus("clearing");
    setError("");
    try {
      const res = await fetch("/api/dev/seed-portal", { method: "DELETE" });
      const data = await safeJson(res);
      if (!data.ok) {
        setError(data.error ?? "Unknown error");
        setStatus("error");
      } else {
        setStatus("cleared");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFCF8] text-[#3E4A3D] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Developer tool</p>
          <h1 className="text-2xl font-light tracking-tight">Seed Portal Demo</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Creates 2 test patients (Alex + Sam), seeds their data, and makes you a therapist.
            Requires <code className="text-xs bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in .env.local.
          </p>
        </div>

        {(status === "idle" || status === "cleared") && (
          <div className="space-y-3">
            {status === "cleared" && (
              <p className="text-center text-sm text-slate-400">Portal data cleared.</p>
            )}
            <button
              onClick={handleSeed}
              className="w-full bg-[#7C9082] text-white py-3 rounded-xl text-sm hover:bg-[#6A7C70] transition"
            >
              Seed portal demo
            </button>
          </div>
        )}

        {(status === "seeding" || status === "clearing") && (
          <div className="text-center">
            <div className="inline-block w-5 h-5 border-2 border-[#7C9082] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-400 text-sm">
              {status === "seeding" ? "Creating test patients…" : "Clearing portal data…"}
            </p>
          </div>
        )}

        {status === "done" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
              <p className="text-sm text-[#3E4A3D]">✓ Alex (improving arc) — emotions, habits, thought records</p>
              <p className="text-sm text-[#3E4A3D]">✓ Sam (struggling arc) — emotions, habits, thought records</p>
              <p className="text-sm text-[#3E4A3D]">✓ You are now a therapist</p>
            </div>
            <Link
              href={`/${locale}/portal`}
              className="block w-full text-center bg-[#7C9082] text-white py-3 rounded-xl text-sm hover:bg-[#6A7C70] transition"
            >
              Go to portal →
            </Link>
            <button
              onClick={handleClear}
              className="w-full py-2 rounded-xl border border-slate-200 text-slate-400 text-sm hover:border-red-200 hover:text-red-400 transition"
            >
              Clear portal data
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => setStatus("idle")}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Try again
            </button>
          </div>
        )}

        <div className="text-center">
          <Link href={`/${locale}/dev/seed`} className="text-xs text-slate-400 hover:text-slate-600 transition">
            ← Regular seed page
          </Link>
        </div>

      </div>
    </main>
  );
}
