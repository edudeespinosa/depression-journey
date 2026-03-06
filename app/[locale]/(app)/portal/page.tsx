"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

type MoodTrend = "improving" | "stable" | "declining" | null;

type PatientSummary = {
  patient_id: string;
  display_name: string;
  last_checkin: string | null;
  checkin_streak: number;
  mood_trend: MoodTrend;
  habits_today: number;
  habits_total: number;
  share_emotions: boolean;
  share_thought_records: boolean;
  share_journals: boolean;
  share_habits: boolean;
};

type Therapist = {
  user_id: string;
  name: string;
  invite_code: string;
};

const TREND_CONFIG: Record<NonNullable<MoodTrend>, { emoji: string; label: string; color: string }> = {
  improving: { emoji: "↗", label: "Improving",  color: "text-emerald-600 bg-emerald-50" },
  stable:    { emoji: "→", label: "Stable",      color: "text-slate-500 bg-slate-100" },
  declining: { emoji: "↘", label: "Needs care",  color: "text-amber-600 bg-amber-50" },
};

function daysSince(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

function LastSeenLabel({ isoDate, t }: { isoDate: string | null; t: ReturnType<typeof useTranslations> }) {
  if (!isoDate) return <span className="text-xs text-slate-400">{t("never")}</span>;
  const days = daysSince(isoDate);
  const label = days === 0 ? t("today") : `${days}d ago`;
  return <span className="text-xs text-slate-400">{label}</span>;
}

export default function PortalPage() {
  const t = useTranslations("portal");
  const locale = useLocale();

  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState("");
  const [patientsError, setPatientsError] = useState("");
  const [codeVisible, setCodeVisible] = useState(false);

  function loadData() {
    return Promise.all([
      fetch("/api/therapist/me").then((r) => r.json()),
      fetch("/api/therapist/patients").then((r) => r.json()),
    ]).then(([meData, patientsData]) => {
      setTherapist(meData.therapist ?? null);
      if (Array.isArray(patientsData)) {
        setPatients(patientsData);
      } else {
        setPatients([]);
        if (patientsData?.error) setPatientsError(patientsData.error);
      }
    });
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleActivate() {
    setActivating(true);
    setActivateError("");
    try {
      const res = await fetch("/api/therapist/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setActivateError(data.error ?? "Failed to activate. Make sure the therapist_profiles table exists in Supabase.");
        return;
      }
      await loadData();
    } catch {
      setActivateError("Network error — check the browser console.");
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center px-4 py-12 flex-1">
        <div className="w-full max-w-2xl">
          <div className="w-5 h-5 border-2 border-[#7C9082] border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!therapist) {
    return (
      <main className="flex flex-col items-center px-4 py-12 flex-1">
        <div className="w-full max-w-2xl">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-medium text-[#2D3B35]">Therapist Portal</h1>
              <p className="mt-1 text-sm text-slate-400">
                Activate your therapist role to view and support your patients.<br />
                You can still use all patient features — this just adds the portal view.
              </p>
            </div>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="px-6 py-2.5 rounded-xl bg-[#7C9082] text-white text-sm font-medium hover:bg-[#6a7d6f] disabled:opacity-60 transition"
            >
              {activating ? "Activating…" : "Activate therapist role"}
            </button>
            {activateError && (
              <p className="text-xs text-red-400 mt-2">{activateError}</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {patients.length > 0
                ? t("activeCount", { count: patients.length })
                : t("noPatients")}
            </p>
          </div>
          {/* Invite code */}
          <button
            onClick={() => setCodeVisible((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
          >
            {t("yourCode")}
          </button>
        </div>

        {/* Invite code reveal */}
        {codeVisible && (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">{t("yourCode")}</p>
              <p className="text-2xl font-mono tracking-widest text-[#2D3B35]">{therapist.invite_code}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(therapist.invite_code)}
              className="text-xs text-[#7C9082] hover:text-[#5a6b60] transition"
            >
              Copy
            </button>
          </div>
        )}

        {/* Empty state */}
        {patients.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-2">
            {patientsError
              ? <p className="text-xs text-red-400 font-mono">{patientsError}</p>
              : <p className="text-slate-500 text-sm">{t("noPatientsHint")}</p>
            }
          </div>
        )}

        {/* Patient list */}
        <div className="space-y-3">
          {patients.map((p) => (
            <Link
              key={p.patient_id}
              href={`/${locale}/portal/${p.patient_id}`}
              className="block bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-[#7C9082]/30 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between">
                {/* Left: name + last seen */}
                <div>
                  <p className="font-medium text-[#2D3B35] capitalize group-hover:text-[#7C9082] transition">
                    {p.display_name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <LastSeenLabel isoDate={p.last_checkin} t={t} />
                    {p.checkin_streak > 0 && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-400">
                          🔥 {t("streak", { n: p.checkin_streak })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: mood trend badge */}
                {p.mood_trend && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TREND_CONFIG[p.mood_trend].color}`}>
                    {TREND_CONFIG[p.mood_trend].emoji} {TREND_CONFIG[p.mood_trend].label}
                  </span>
                )}
              </div>

              {/* Habits progress bar */}
              {p.share_habits && p.habits_total > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Habits today</span>
                    <span>{p.habits_today}/{p.habits_total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-[#7C9082] transition-all duration-500"
                      style={{ width: `${p.habits_total > 0 ? (p.habits_today / p.habits_total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Permission tags */}
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {p.share_emotions && <Tag>Emotions</Tag>}
                {p.share_thought_records && <Tag>Thoughts</Tag>}
                {p.share_habits && <Tag>Habits</Tag>}
                {p.share_journals && <Tag>Journal</Tag>}
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
      {children}
    </span>
  );
}
