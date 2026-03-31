"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

type Session = {
  id: string;
  image_url: string | null;
  initial_note: string;
  ai_snippet: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ArtPage() {
  const t = useTranslations("art");
  const locale = useLocale();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/art/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-slate-500 text-sm">{t("subtitle")}</p>
          </div>
          <Link
            href={`/${locale}/art/new`}
            className="text-sm px-4 py-2 rounded-xl font-medium transition"
            style={{ background: "#7C9082", color: "#fff" }}
          >
            {t("newSession")}
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-[#7C9082] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "#F0EDE6" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9AA89E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="1" fill="#9AA89E" stroke="none" />
                <circle cx="17.5" cy="10.5" r="1" fill="#9AA89E" stroke="none" />
                <circle cx="8.5" cy="7.5" r="1" fill="#9AA89E" stroke="none" />
                <circle cx="6.5" cy="12.5" r="1" fill="#9AA89E" stroke="none" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">{t("noSessions")}</p>
            <Link href={`/${locale}/art/new`} className="text-sm text-[#7C9082] hover:underline">
              {t("noSessionsHint")}
            </Link>
          </div>
        )}

        {/* Session cards */}
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/${locale}/art/${s.id}`}
              className="flex gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-[#7C9082]/30 hover:shadow-md transition group"
            >
              {/* Thumbnail */}
              <div
                className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden"
                style={{ background: "#F0EDE6" }}
              >
                {s.image_url ? (
                  <Image
                    src={s.image_url}
                    alt=""
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9AA89E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r="1" fill="#9AA89E" stroke="none" />
                      <circle cx="17.5" cy="10.5" r="1" fill="#9AA89E" stroke="none" />
                      <circle cx="8.5" cy="7.5" r="1" fill="#9AA89E" stroke="none" />
                      <circle cx="6.5" cy="12.5" r="1" fill="#9AA89E" stroke="none" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">{formatDate(s.created_at)}</p>
                <p className="text-sm text-[#3E4A3D] font-medium truncate group-hover:text-[#7C9082] transition">
                  {s.initial_note}
                </p>
                {s.ai_snippet && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {s.ai_snippet}…
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
