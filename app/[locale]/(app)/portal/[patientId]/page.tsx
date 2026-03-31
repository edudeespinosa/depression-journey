"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { use } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Checkin = { emotion: string; intensity: number; created_at: string };
type ThoughtRecord = {
  id: string;
  situation: string;
  automatic_thought: string;
  emotion: string;
  intensity: number;
  evidence_for: string | null;
  evidence_against: string | null;
  balanced_thought: string | null;
  outcome_emotion: string | null;
  outcome_intensity: number | null;
  created_at: string;
};
type Habit = {
  id: string;
  name: string;
  target_per_week: number;
  schedule_type: string;
  week_count: number;
  today_count: number;
  completed: boolean;
};
type JournalEntry = { id: string; content: string; mood: string; created_at: string };
type ArtMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string };
type ArtSession = { id: string; image_url: string | null; initial_note: string; created_at: string; messages: ArtMessage[] };
type Permissions = {
  share_emotions: boolean;
  share_thought_records: boolean;
  share_journals: boolean;
  share_habits: boolean;
};
type PatientData = {
  display_name: string;
  checkins: Checkin[];
  thought_records: ThoughtRecord[];
  habits: Habit[];
  journal_entries: JournalEntry[];
  permissions: Permissions;
};

type Tab = "emotions" | "thoughts" | "habits" | "journal" | "art";

// ─── Color helpers (matching dashboard) ───────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  positive: "#F59E0B",
  low:      "#94A3B8",
  angry:    "#EF4444",
  anxious:  "#14B8A6",
  complex:  "#A855F7",
};

const LABEL_TO_CAT: Record<string, string> = {
  Happy:"positive", Ecstatic:"positive", Confident:"positive",
  Hopeful:"positive", Proud:"positive",
  Sad:"low", Depressed:"low", Lonely:"low", Bored:"low", Exhausted:"low", Grieved:"low",
  Angry:"angry", Frustrated:"angry", Enraged:"angry", Resentful:"angry",
  Anxious:"anxious", Scared:"anxious", Terrified:"anxious", Cautious:"anxious",
  Confused:"complex", Ashamed:"complex", Guilty:"complex", Jealous:"complex",
  Disgusted:"complex", Suspicious:"complex", Overwhelmed:"complex",
  Frantic:"complex", Timid:"complex", Surprised:"complex",
  // lowercase from seed
  happy:"positive", ecstatic:"positive", confident:"positive",
  hopeful:"positive", proud:"positive",
  sad:"low", depressed:"low", lonely:"low", bored:"low", exhausted:"low", grieved:"low",
  angry:"angry", frustrated:"angry", enraged:"angry", resentful:"angry",
  anxious:"anxious", scared:"anxious", terrified:"anxious", cautious:"anxious",
  confused:"complex", ashamed:"complex", guilty:"complex", jealous:"complex",
  disgusted:"complex", suspicious:"complex", overwhelmed:"complex",
  frantic:"complex", timid:"complex", surprised:"complex",
};

// ─── Mood dot timeline (30 days) ──────────────────────────────────────────────
function MoodDots({ checkins }: { checkins: Checkin[] }) {
  const dayMap = new Map<string, Checkin>();
  for (const c of checkins) {
    const key = new Date(c.created_at).toDateString();
    const existing = dayMap.get(key);
    if (!existing || c.intensity > existing.intensity) dayMap.set(key, c);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slots: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    slots.push(d);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));

  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5 flex-1 justify-around">
            {week.map((d, di) => {
              const c = dayMap.get(d.toDateString());
              const cat = c ? (LABEL_TO_CAT[c.emotion] ?? "low") : null;
              const color = cat ? CATEGORY_COLOR[cat] : "#E2E8F0";
              const opacity = c ? 0.3 + (c.intensity / 100) * 0.7 : 1;
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={di} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    title={c ? `${c.emotion} · ${c.intensity}%` : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    style={{
                      width: "100%", maxWidth: "28px", aspectRatio: "1",
                      borderRadius: "50%", backgroundColor: color, opacity,
                      outline: isToday ? "2px solid #7C9082" : "none",
                      outlineOffset: "2px",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5 flex-1 justify-around">
            {week.map((d, di) => (
              <div key={di} className="flex-1 text-center">
                <span className="text-[9px] text-slate-300 font-medium">{DAY_LABELS[d.getDay()]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Emotion frequency bars ────────────────────────────────────────────────────
function EmotionBars({ checkins }: { checkins: Checkin[] }) {
  const counts = new Map<string, number>();
  for (const c of checkins) {
    const cat = LABEL_TO_CAT[c.emotion] ?? "low";
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  if (!counts.size) return <p className="text-sm text-slate-300">No data.</p>;
  const max = Math.max(...counts.values(), 1);
  const LABELS: Record<string, string> = { positive: "Positive", low: "Low", angry: "Angry", anxious: "Anxious", complex: "Complex" };
  return (
    <div className="space-y-3">
      {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
        <div key={cat} className="space-y-1">
          <div className="flex justify-between">
            <span className="text-xs text-slate-500">{LABELS[cat] ?? cat}</span>
            <span className="text-xs text-slate-400">{count}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${(count / max) * 100}%`, backgroundColor: CATEGORY_COLOR[cat] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Thought record card (read-only) ─────────────────────────────────────────
function ThoughtCard({ record }: { record: ThoughtRecord }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(record.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const intensityColor = record.intensity >= 8 ? "bg-red-100 text-red-700" :
    record.intensity >= 5 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2D3B35] truncate">{record.situation}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">{dateStr}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-[#7C9082] capitalize">{record.emotion}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${intensityColor}`}>
              {record.intensity}/10
            </span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-slate-50">
          <ReadField label="Automatic thought" value={record.automatic_thought} />
          {record.evidence_for && <ReadField label="Evidence for" value={record.evidence_for} />}
          {record.evidence_against && <ReadField label="Evidence against" value={record.evidence_against} />}
          {record.balanced_thought && <ReadField label="Balanced thought" value={record.balanced_thought} />}
          {record.outcome_emotion && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">After:</span>
              <span className="text-xs text-[#7C9082] capitalize">{record.outcome_emotion}</span>
              {record.outcome_intensity != null && (
                <span className="text-xs text-slate-400">{record.outcome_intensity}/10</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-[#2D3B35]">{value}</p>
    </div>
  );
}

// ─── Habit row (read-only) ────────────────────────────────────────────────────
function HabitRow({ habit }: { habit: Habit }) {
  const pct = Math.min(100, (habit.week_count / habit.target_per_week) * 100);
  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#2D3B35]">{habit.name}</p>
        <span className="text-xs text-slate-400">{habit.week_count}/{habit.target_per_week}× this week</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#7C9082" : "#93C5A0" }}
        />
      </div>
    </div>
  );
}

// ─── Journal entry card ────────────────────────────────────────────────────────
function JournalCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const preview = entry.content.slice(0, 120) + (entry.content.length > 120 ? "…" : "");
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded((p) => !p)} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">{dateStr} · {entry.mood}</p>
            <p className="text-sm text-slate-600">{expanded ? entry.content : preview}</p>
          </div>
          <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const locale = useLocale();
  const t = useTranslations("portal");

  const [data, setData] = useState<PatientData | null>(null);
  const [artSessions, setArtSessions] = useState<ArtSession[]>([]);
  const [artBlocked, setArtBlocked] = useState(false);
  const [expandedArtSession, setExpandedArtSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("emotions");

  useEffect(() => {
    Promise.all([
      fetch(`/api/therapist/patients/${patientId}`).then((r) => r.json()),
      fetch(`/api/therapist/patients/${patientId}/art`).then((r) => r.json()),
    ]).then(([patientData, artData]) => {
      if (patientData && !patientData.error) setData(patientData);
      if (artData?.blocked) setArtBlocked(true);
      else if (Array.isArray(artData)) setArtSessions(artData);
    }).finally(() => setLoading(false));
  }, [patientId]);

  const tArt = useTranslations("art");

  const TABS: { id: Tab; label: string }[] = [
    { id: "emotions", label: t("tabs.emotions") },
    { id: "thoughts", label: t("tabs.thoughts") },
    { id: "habits",   label: t("tabs.habits")   },
    { id: "journal",  label: t("tabs.journal")  },
    { id: "art",      label: tArt("portalTitle") },
  ];

  if (loading) {
    return (
      <main className="flex flex-col items-center px-4 py-12 flex-1">
        <div className="w-5 h-5 border-2 border-[#7C9082] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex flex-col items-center px-4 py-12 flex-1">
        <div className="w-full max-w-2xl">
          <Link href={`/${locale}/portal`} className="text-sm text-slate-400 hover:text-slate-600 transition">← Back</Link>
          <p className="mt-4 text-sm text-slate-400">Patient not found or access denied.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div>
          <Link href={`/${locale}/portal`} className="text-sm text-slate-400 hover:text-slate-600 transition">
            ← All patients
          </Link>
          <h1 className="mt-2 text-3xl font-light tracking-tight capitalize">{data.display_name}</h1>
          {data.checkins.length > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Last check-in: {new Date(data.checkins[0].created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-[#2D3B35] shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "emotions" && (
          <div className="space-y-6">
            {!data.permissions.share_emotions ? (
              <p className="text-sm text-slate-400 text-center py-8">Patient hasn&apos;t shared emotion data.</p>
            ) : data.checkins.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t("noData")}</p>
            ) : (
              <>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">30-day mood</p>
                  <MoodDots checkins={data.checkins} />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Emotion patterns</p>
                  <EmotionBars checkins={data.checkins} />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "thoughts" && (
          <div className="space-y-3">
            {!data.permissions.share_thought_records ? (
              <p className="text-sm text-slate-400 text-center py-8">Patient hasn&apos;t shared thought records.</p>
            ) : data.thought_records.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t("noData")}</p>
            ) : (
              data.thought_records.map((r) => <ThoughtCard key={r.id} record={r} />)
            )}
          </div>
        )}

        {activeTab === "habits" && (
          <div className="space-y-3">
            {!data.permissions.share_habits ? (
              <p className="text-sm text-slate-400 text-center py-8">Patient hasn&apos;t shared habits.</p>
            ) : data.habits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t("noData")}</p>
            ) : (
              data.habits.map((h) => <HabitRow key={h.id} habit={h} />)
            )}
          </div>
        )}

        {activeTab === "journal" && (
          <div className="space-y-3">
            {!data.permissions.share_journals ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-400">{t("journalBlocked")}</p>
              </div>
            ) : data.journal_entries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t("noData")}</p>
            ) : (
              data.journal_entries.map((e) => <JournalCard key={e.id} entry={e} />)
            )}
          </div>
        )}

        {activeTab === "art" && (
          <div className="space-y-4">
            {artBlocked ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-400">{tArt("portalBlocked")}</p>
              </div>
            ) : artSessions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{tArt("portalEmpty")}</p>
            ) : (
              artSessions.map((s) => (
                <div key={s.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition"
                    onClick={() => setExpandedArtSession(expandedArtSession === s.id ? null : s.id)}
                  >
                    <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: "#F0EDE6" }}>
                      {s.image_url ? (
                        <Image src={s.image_url} alt="" width={56} height={56} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA89E" strokeWidth="1.5">
                            <circle cx="13.5" cy="6.5" r="1" fill="#9AA89E" stroke="none" />
                            <circle cx="17.5" cy="10.5" r="1" fill="#9AA89E" stroke="none" />
                            <circle cx="8.5" cy="7.5" r="1" fill="#9AA89E" stroke="none" />
                            <circle cx="6.5" cy="12.5" r="1" fill="#9AA89E" stroke="none" />
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p className="text-sm text-[#3E4A3D] font-medium truncate mt-0.5">{s.initial_note}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.messages.length} messages</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA89E" strokeWidth="2"
                      className="flex-shrink-0 transition-transform"
                      style={{ transform: expandedArtSession === s.id ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {expandedArtSession === s.id && (
                    <div className="border-t border-slate-100 px-4 py-4 space-y-3" style={{ background: "#FDFCF8" }}>
                      {s.image_url && (
                        <div className="rounded-xl overflow-hidden border border-slate-100">
                          <Image src={s.image_url} alt="" width={600} height={400} className="w-full object-contain" style={{ maxHeight: "280px" }} unoptimized />
                        </div>
                      )}
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm text-sm leading-relaxed" style={{ background: "#E2E8E3", color: "#3E4A3D" }}>
                          {s.initial_note}
                        </div>
                      </div>
                      {s.messages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                            style={m.role === "user"
                              ? { background: "#E2E8E3", color: "#3E4A3D", borderTopRightRadius: "4px" }
                              : { background: "#fff", color: "#2D3B35", border: "1px solid #d5e8dc", borderTopLeftRadius: "4px" }}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </main>
  );
}
