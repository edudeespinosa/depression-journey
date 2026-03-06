"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

type Mood = "low" | "okay" | "good";

type Entry = {
  id: string;
  content: string;
  ai_response: string | null;
  mood: Mood | null;
  created_at: string;
};

const MOOD_ICON: Record<Mood, string> = { low: "😔", okay: "😐", good: "🙂" };

function EntryCard({ entry, localeTag }: { entry: Entry; localeTag: string }) {
  const [expanded, setExpanded] = useState(false);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(localeTag, { weekday: "short", month: "short", day: "numeric" });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(localeTag, { hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition"
      >
        <span className="text-xl flex-shrink-0 mt-0.5">
          {entry.mood ? MOOD_ICON[entry.mood] : "📝"}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{formatDate(entry.created_at)}</span>
            <span className="text-xs text-slate-300">{formatTime(entry.created_at)}</span>
          </div>
          <p className="text-sm text-[#2D3B35] leading-relaxed line-clamp-2">
            {entry.content}
          </p>
        </div>

        <span className="text-slate-300 text-xs flex-shrink-0 mt-1">
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          <div className="pt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </div>

          {entry.ai_response && (
            <div className="px-3 py-3 rounded-lg bg-[#f6f4fc] border border-[#d5cff0] text-sm text-[#2D3B35] leading-relaxed whitespace-pre-wrap">
              {entry.ai_response}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JournalHistoryPage() {
  const t = useTranslations("history");
  const locale = useLocale();
  const localeTag = locale === "es" ? "es-MX" : "en-US";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/journal/entries")
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(localeTag, { weekday: "short", month: "short", day: "numeric" });
  }

  function groupByDate(entries: Entry[]) {
    const groups: { label: string; entries: Entry[] }[] = [];
    const map = new Map<string, Entry[]>();

    for (const e of entries) {
      const key = new Date(e.created_at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    for (const [key, list] of map) {
      const label =
        key === today ? t("dateGroups.today") :
        key === yesterday ? t("dateGroups.yesterday") :
        formatDate(list[0].created_at);
      groups.push({ label, entries: list });
    }

    return groups;
  }

  const groups = groupByDate(entries);

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        <div>
          <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-slate-500 text-sm">
            {entries.length === 0 && !loading
              ? t("emptyState")
              : t("entryCount", { count: entries.length })}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">{t("emptyReflections")}</p>
            <Link href={`/${locale}/journal`} className="mt-4 inline-block text-sm text-[#8B7EC8] hover:underline">
              {t("firstEntryLink")}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ label, entries }) => (
              <div key={label} className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
                {entries.map((e) => <EntryCard key={e.id} entry={e} localeTag={localeTag} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
