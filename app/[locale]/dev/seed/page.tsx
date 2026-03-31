"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";

type Status = "idle" | "seeding" | "clearing" | "done" | "cleared" | "error";

export default function DevSeedPage() {
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{ checkins: number; habits: number; logs: number; journals: number; thoughts: number; artSessions: number } | null>(null);
  const [error, setError] = useState("");

  async function handleSeed() {
    setStatus("seeding");
    setError("");
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unknown error");
        setStatus("error");
      } else {
        setResult(data);
        setStatus("done");
      }
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  async function handleClear() {
    setStatus("clearing");
    setError("");
    try {
      const res = await fetch("/api/dev/seed", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unknown error");
        setStatus("error");
      } else {
        setResult(null);
        setStatus("cleared");
      }
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFCF8] text-[#3E4A3D] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Developer tool</p>
          <h1 className="text-2xl font-light tracking-tight">Seed Demo Data</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Inserts 31 check-ins, 4 habits, 7 journal entries, 3 thought records, and 2 art sessions into your account.
          </p>
        </div>

        {(status === "idle" || status === "cleared") && (
          <div className="space-y-3">
            {status === "cleared" && (
              <p className="text-center text-sm text-slate-400">All data cleared.</p>
            )}
            <button
              onClick={handleSeed}
              className="w-full bg-[#7C9082] text-white py-3 rounded-xl text-sm hover:bg-[#6A7C70] transition"
            >
              Seed demo data
            </button>
          </div>
        )}

        {(status === "seeding" || status === "clearing") && (
          <div className="text-center">
            <div className="inline-block w-5 h-5 border-2 border-[#7C9082] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-400 text-sm">
              {status === "seeding" ? "Inserting data…" : "Clearing data…"}
            </p>
          </div>
        )}

        {status === "done" && result && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
              <p className="text-sm text-[#3E4A3D]">✓ {result.checkins} check-ins inserted</p>
              <p className="text-sm text-[#3E4A3D]">✓ {result.habits} habits inserted</p>
              <p className="text-sm text-[#3E4A3D]">✓ {result.logs} habit log entries inserted</p>
              <p className="text-sm text-[#3E4A3D]">✓ {result.journals} journal entries inserted</p>
              <p className="text-sm text-[#3E4A3D]">✓ {result.thoughts} thought records inserted</p>
              <p className="text-sm text-[#3E4A3D]">✓ {result.artSessions} art sessions inserted</p>
            </div>
            <Link
              href={`/${locale}/dashboard`}
              className="block w-full text-center bg-[#7C9082] text-white py-3 rounded-xl text-sm hover:bg-[#6A7C70] transition"
            >
              Go to dashboard →
            </Link>
            <button
              onClick={handleClear}
              className="w-full py-2 rounded-xl border border-slate-200 text-slate-400 text-sm hover:border-red-200 hover:text-red-400 transition"
            >
              Clear all data
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

      </div>
    </main>
  );
}
