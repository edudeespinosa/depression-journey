"use client";

import { useState, useRef } from "react";
import Nav from "@/components/Nav";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

type ReflectionState = "idle" | "loading" | "streaming" | "done" | "error";
type Mood = "low" | "okay" | "good";

export default function JournalPage() {
  const t = useTranslations("journal");
  const locale = useLocale();
  const [entry, setEntry] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [reflection, setReflection] = useState("");
  const [state, setState] = useState<ReflectionState>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const MOODS: { value: Mood; icon: string; label: string }[] = [
    { value: "low",  icon: "😔", label: t("moods.low")  },
    { value: "okay", icon: "😐", label: t("moods.okay") },
    { value: "good", icon: "🙂", label: t("moods.good") },
  ];

  const wordCount = entry.trim() ? entry.trim().split(/\s+/).length : 0;
  const canSubmit = entry.trim().length > 10 && state !== "loading" && state !== "streaming";

  async function handleReflect() {
    if (!canSubmit) return;

    abortRef.current = new AbortController();
    setState("loading");
    setReflection("");

    try {
      const res = await fetch("/api/journal/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry, mood, locale }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      setState("streaming");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setReflection((prev) => prev + decoder.decode(value, { stream: true }));
      }

      setState("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState("error");
    }
  }

  function handleNew() {
    abortRef.current?.abort();
    setEntry("");
    setMood(null);
    setReflection("");
    setState("idle");
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#3E4A3D] flex flex-col">
      <Nav />

      <main className="flex flex-col items-center px-4 py-12 flex-1">
        <div className="w-full max-w-2xl space-y-8">

          {/* Page header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
              <p className="mt-1 text-slate-500 text-sm">{t("subtitle")}</p>
            </div>
            <Link href={`/${locale}/journal/history`} className="text-xs text-slate-400 hover:text-[#7C9082] transition pb-1">
              {t("pastEntriesLink")}
            </Link>
          </div>

          {/* Entry area */}
          {state !== "done" && (
            <div className="space-y-4">
              {/* Mood selector */}
              <div>
                <p className="text-xs text-slate-400 mb-2">{t("moodPrompt")}</p>
                <div className="flex gap-2">
                  {MOODS.map(({ value, icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setMood(mood === value ? null : value)}
                      disabled={state === "loading" || state === "streaming"}
                      className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-sm transition disabled:opacity-50 ${
                        mood === value
                          ? "border-[#7C9082] bg-[#7C9082]/10 text-[#3E4A3D]"
                          : "border-slate-200 text-slate-400 hover:border-[#7C9082]"
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-[10px] mt-0.5">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder={t("textareaPlaceholder")}
                rows={7}
                disabled={state === "loading" || state === "streaming"}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                           text-[#3E4A3D] placeholder:text-slate-300
                           focus:outline-none focus:ring-1 focus:ring-[#7C9082]
                           resize-none leading-relaxed disabled:opacity-60 transition"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t("wordCount", { count: wordCount })}</span>
                <button
                  onClick={handleReflect}
                  disabled={!canSubmit}
                  className="bg-[#7C9082] text-white px-6 py-2 rounded-lg text-sm
                             hover:bg-[#6A7C70] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {state === "loading" ? t("listeningButton") : t("reflectButton")}
                </button>
              </div>
            </div>
          )}

          {/* Streaming / response */}
          {(state === "streaming" || state === "done") && (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-sm leading-relaxed">
                {mood && (
                  <span className="inline-block mb-2 text-base">
                    {MOODS.find((m) => m.value === mood)?.icon}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{entry}</p>
              </div>

              <div className="px-4 py-4 rounded-xl bg-white border border-[#c8d5c9] leading-relaxed whitespace-pre-wrap text-[#3E4A3D]">
                {reflection}
                {state === "streaming" && (
                  <span className="inline-block w-1 h-4 ml-1 bg-[#7C9082] animate-pulse rounded-sm" />
                )}
              </div>

              {state === "done" && (
                <div className="space-y-2">
                  <p className="text-xs text-center text-slate-400">{t("savedMessage")}</p>
                  <button
                    onClick={handleNew}
                    className="w-full py-2 rounded-lg border border-slate-200 text-slate-500
                               hover:border-[#7C9082] hover:text-[#7C9082] text-sm transition"
                  >
                    {t("writeAnotherButton")}
                  </button>
                </div>
              )}
            </div>
          )}

          {state === "error" && (
            <p className="text-sm text-red-400 text-center">{t("errorMessage")}</p>
          )}
        </div>
      </main>
    </div>
  );
}
