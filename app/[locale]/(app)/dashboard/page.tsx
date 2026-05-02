"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import AffirmationBanner from "@/components/AffirmationBanner";
import AgentSuggestion from "@/components/AgentSuggestion";

type Checkin = { emotion: string; intensity: number; created_at: string };
type Habit   = { id: string; completed: boolean; week_count: number; target_per_week: number };

const CATEGORY_COLOR: Record<string, string> = {
  positive: "#F59E0B",
  low:      "#94A3B8",
  angry:    "#EF4444",
  anxious:  "#14B8A6",
  complex:  "#A855F7",
};

const LABEL_TO_CAT: Record<string, string> = {
  Happy:"positive", Ecstatic:"positive", Confident:"positive",
  Hopeful:"positive", "In love":"positive", Proud:"positive",
  Sad:"low", Depressed:"low", Lonely:"low",
  Bored:"low", Exhausted:"low", Grieved:"low",
  Angry:"angry", Frustrated:"angry", Enraged:"angry", Resentful:"angry",
  Anxious:"anxious", Scared:"anxious", Terrified:"anxious", Cautious:"anxious",
  Confused:"complex", Ashamed:"complex", Guilty:"complex", Jealous:"complex",
  Disgusted:"complex", Suspicious:"complex", Overwhelmed:"complex",
  Frantic:"complex", Timid:"complex", Surprised:"complex",
  Alegre:"positive", Extasiado:"positive", Confiado:"positive",
  Esperanzado:"positive", Enamorado:"positive", Presumido:"positive",
  Triste:"low", Deprimido:"low", Solo:"low",
  Aburrido:"low", Exhausto:"low", Apenado:"low",
  Enojado:"angry", Frustrado:"angry", Enfurecido:"angry", "Malévolo":"angry",
  Ansioso:"anxious", Asustado:"anxious", Aterrado:"anxious", Precavido:"anxious",
  Confuso:"complex", Avergonzado:"complex", Culpable:"complex", Celoso:"complex",
  Desagrado:"complex", Sospechoso:"complex", Abrumado:"complex",
  "Histérico":"complex", "Tímido":"complex", Sorprendido:"complex",
};

function getCheckinStreak(checkins: Checkin[]): number {
  const days = new Set(checkins.map((c) => new Date(c.created_at).toDateString()));
  const today = new Date().toDateString();
  let streak = 0;
  const d = new Date();
  if (!days.has(today)) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function filterByDays(checkins: Checkin[], days: number): Checkin[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  return checkins.filter((c) => new Date(c.created_at) >= cutoff);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Mood dot timeline ────────────────────────────────────────────────────────
function MoodDots({ checkins, days }: { checkins: Checkin[]; days: number }) {
  const dayMap = new Map<string, Checkin>();
  for (const c of checkins) {
    const key = new Date(c.created_at).toDateString();
    const existing = dayMap.get(key);
    if (!existing || c.intensity > existing.intensity) dayMap.set(key, c);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slots: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    slots.push(d);
  }

  // Group into weeks of 7
  const weeks: Date[][] = [];
  for (let i = 0; i < slots.length; i += 7) {
    weeks.push(slots.slice(i, i + 7));
  }

  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5 flex-1 justify-around">
            {week.map((d, di) => {
              const key = d.toDateString();
              const c = dayMap.get(key);
              const cat = c ? (LABEL_TO_CAT[c.emotion] ?? "low") : null;
              const color = cat ? CATEGORY_COLOR[cat] : "#E2E8F0";
              const opacity = c ? 0.3 + (c.intensity / 100) * 0.7 : 1;
              const isToday = d.toDateString() === today.toDateString();
              const globalIndex = wi * 7 + di;

              return (
                <div key={globalIndex} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    title={c ? `${c.emotion} · ${c.intensity}%` : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    style={{
                      width: "100%",
                      maxWidth: "28px",
                      aspectRatio: "1",
                      borderRadius: "50%",
                      backgroundColor: color,
                      opacity,
                      outline: isToday ? "2px solid #7C9082" : "none",
                      outlineOffset: "2px",
                      cursor: c ? "default" : "default",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Day-of-week labels */}
      <div className="flex gap-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5 flex-1 justify-around">
            {week.map((d, di) => (
              <div key={di} className="flex-1 text-center">
                <span className="text-[9px] text-slate-300 font-medium">
                  {DAY_LABELS[d.getDay()]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Frequency bars ───────────────────────────────────────────────────────────
function FrequencyBars({ checkins, t }: { checkins: Checkin[]; t: ReturnType<typeof useTranslations> }) {
  const counts = new Map<string, number>();
  for (const c of checkins) {
    const cat = LABEL_TO_CAT[c.emotion] ?? "low";
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const max = Math.max(...counts.values(), 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {sorted.map(([cat, count]) => (
        <div key={cat} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{t(`categories.${cat}`)}</span>
            <span className="text-xs text-slate-400">{count}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${(count / max) * 100}%`, backgroundColor: CATEGORY_COLOR[cat] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</h2>
      {action}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<14 | 30>(14);

  useEffect(() => {
    Promise.all([
      fetch("/api/checkin/history").then((r) => r.json()),
      fetch("/api/habits").then((r) => r.json()),
    ]).then(([c, h]) => {
      setCheckins(Array.isArray(c) ? c : []);
      setHabits(Array.isArray(h) ? h : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const visibleCheckins = filterByDays(checkins, tab);
  const streak = getCheckinStreak(checkins);
  const completedToday = habits.filter((h) => h.completed).length;
  const weekCompleted  = habits.reduce((s, h) => s + h.week_count, 0);
  const weekTarget     = habits.reduce((s, h) => s + h.target_per_week, 0);
  const hasCheckinToday = checkins.some((c) =>
    new Date(c.created_at).toDateString() === new Date().toDateString()
  );

  return (
    <main className="flex flex-col px-6 py-8 flex-1 max-w-2xl mx-auto w-full">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-light text-[#2D3B35]">{greeting()}</h1>
      </div>

      {/* ── Agent suggestion ─────────────────────────────────────────────── */}
      <div className="mb-4">
        <AgentSuggestion />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Check-in CTA ─────────────────────────────────────────────── */}
          {!hasCheckinToday && (
            <Link href={`/${locale}/checkin`}>
              <Card className="p-4 border-dashed border-[#c8d5c9] hover:bg-[#7C9082]/5 transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#7C9082]">{t("goToCheckin")}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Take a moment for yourself</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#7C9082]/10 flex items-center justify-center text-[#7C9082]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {/* ── Affirmation banner ───────────────────────────────────────── */}
          <AffirmationBanner />

          {/* ── Stats row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t("streakLabel")}</p>
                <span className="text-base">🔥</span>
              </div>
              <p className="text-3xl font-light text-[#D4956A]">
                {streak > 0 ? streak : "—"}
              </p>
              <p className="text-xs text-slate-400 mt-1">{streak === 1 ? "day" : "days"}</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t("habitsTodayLabel")}</p>
                <span className="text-base">✓</span>
              </div>
              <p className="text-3xl font-light text-[#D4956A]">
                {habits.length > 0 ? completedToday : "—"}
              </p>
              {habits.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">of {habits.length} today</p>
              )}
            </Card>
          </div>

          {/* ── Mood timeline ─────────────────────────────────────────────── */}
          <Card className="p-5">
            <SectionHeader
              title={t("moodSection")}
              action={
                <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  {([14, 30] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setTab(v)}
                      className={`px-3 py-1 rounded-md text-xs transition ${
                        tab === v
                          ? "bg-white text-[#2D3B35] shadow-sm font-medium"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {v === 14 ? t("tab14") : t("tab30")}
                    </button>
                  ))}
                </div>
              }
            />

            {visibleCheckins.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-300">{t("noCheckins")}</p>
              </div>
            ) : (
              <MoodDots checkins={visibleCheckins} days={tab} />
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-4 border-t border-slate-50 mt-4">
              {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-slate-400">{t(`categories.${cat}`)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Emotion patterns ─────────────────────────────────────────── */}
          {visibleCheckins.length > 0 && (
            <Card className="p-5">
              <SectionHeader title={t("emotionsSection")} />
              <FrequencyBars checkins={visibleCheckins} t={t} />
            </Card>
          )}

          {/* ── Habits ───────────────────────────────────────────────────── */}
          <Card className="p-5">
            <SectionHeader
              title={t("habitsSection")}
              action={
                habits.length > 0 ? (
                  <Link href={`/${locale}/habits`} className="text-xs text-slate-400 hover:text-[#7C9082] transition">
                    {t("goToHabits")} →
                  </Link>
                ) : undefined
              }
            />

            {habits.length === 0 ? (
              <div className="py-4 text-center">
                <Link href={`/${locale}/habits`} className="text-sm text-[#7C9082] hover:underline">
                  {t("noHabits")}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Today */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Today</span>
                    <span className="text-xs font-medium text-[#D4956A]">{completedToday}/{habits.length}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{
                        width: `${(completedToday / habits.length) * 100}%`,
                        background: "linear-gradient(90deg, #D4956A, #e8b897)",
                      }}
                    />
                  </div>
                </div>

                {/* Week */}
                {weekTarget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">{t("habitsWeekLabel")}</span>
                      <span className="text-xs font-medium text-[#3E4A3D]">{weekCompleted}/{weekTarget}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((weekCompleted / weekTarget) * 100, 100)}%`,
                          background: "linear-gradient(90deg, #7C9082aa, #a0b8a5aa)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

        </div>
      )}
    </main>
  );
}
