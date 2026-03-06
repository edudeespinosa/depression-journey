"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

type Checkin = {
  id: string;
  emotion: string;
  intensity: number;
  ai_response: string | null;
  created_at: string;
};

function CheckinCard({ checkin, localeTag }: { checkin: Checkin; localeTag: string }) {
  const [expanded, setExpanded] = useState(false);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(localeTag, { weekday: "short", month: "short", day: "numeric" });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(localeTag, { hour: "numeric", minute: "2-digit" });
  }

  const intensityColor =
    checkin.intensity >= 70 ? "text-red-400" :
    checkin.intensity >= 40 ? "text-amber-500" :
    "text-slate-400";

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition"
      >
        <span className="text-xl flex-shrink-0 mt-0.5">💭</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{formatDate(checkin.created_at)}</span>
            <span className="text-xs text-slate-300">{formatTime(checkin.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#3E4A3D] font-medium">{checkin.emotion}</span>
            <span className={`text-xs font-light ${intensityColor}`}>{checkin.intensity}%</span>
          </div>
        </div>

        <span className="text-slate-300 text-xs flex-shrink-0 mt-1">
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {expanded && checkin.ai_response && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="pt-3 px-3 py-3 rounded-lg bg-[#f5f8f5] border border-[#dce8dc] text-sm text-[#3E4A3D] leading-relaxed">
            {checkin.ai_response}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckinHistoryPage() {
  const t = useTranslations("checkin");
  const locale = useLocale();
  const localeTag = locale === "es" ? "es-MX" : "en-US";

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/checkin/history")
      .then((r) => r.json())
      .then((data) => { setCheckins(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(localeTag, { weekday: "short", month: "short", day: "numeric" });
  }

  function groupByDate(items: Checkin[]) {
    const groups: { label: string; items: Checkin[] }[] = [];
    const map = new Map<string, Checkin[]>();

    for (const c of items) {
      const key = new Date(c.created_at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    for (const [key, list] of map) {
      const label =
        key === today ? t("history.today") :
        key === yesterday ? t("history.yesterday") :
        formatDate(list[0].created_at);
      groups.push({ label, items: list });
    }

    return groups;
  }

  const groups = groupByDate(checkins);

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        <div>
          <h1 className="text-3xl font-light tracking-tight">{t("history.title")}</h1>
          <p className="mt-1 text-slate-500 text-sm">
            {checkins.length === 0 && !loading
              ? t("history.empty")
              : t("history.count", { count: checkins.length })}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : checkins.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">{t("history.empty")}</p>
            <Link
              href={`/${locale}/checkin`}
              className="mt-4 inline-block text-sm text-[#7C9082] hover:underline"
            >
              {t("history.emptyLink")}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ label, items }) => (
              <div key={label} className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
                {items.map((c) => (
                  <CheckinCard key={c.id} checkin={c} localeTag={localeTag} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
