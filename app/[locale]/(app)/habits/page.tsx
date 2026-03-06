"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";

type CommitmentLevel = "gentle" | "steady" | "focused";
type ScheduleType = "flexible" | "specific_days" | "daily_count";

type Habit = {
  id: string;
  name: string;
  target_per_week: number;
  commitment_level: CommitmentLevel;
  schedule_type: ScheduleType;
  scheduled_days: number[] | null;
  times_per_day: number;
  completed: boolean;
  week_count: number;
  today_count: number;
  completed_week_days: number[];
};

const COMMITMENT_ICONS: Record<CommitmentLevel, string> = {
  gentle: "🌿",
  steady: "⚡",
  focused: "🎯",
};

// ISO weekday number for today (1=Mon..7=Sun)
function todayIsoWeekday(): number {
  const dow = new Date().getDay(); // 0=Sun
  return dow === 0 ? 7 : dow;
}

function getIsoWeekday(dateStr: string): number {
  const dow = new Date(dateStr + "T12:00:00").getDay();
  return dow === 0 ? 7 : dow;
}

// ─── Weekly progress ring ─────────────────────────────────────────────────────

function WeeklyRing({ habits }: { habits: Habit[] }) {
  const t = useTranslations("habits.weekRing");
  if (habits.length === 0) return null;

  const totalTarget = habits.reduce((s, h) => s + h.target_per_week, 0);
  const totalDone = habits.reduce((s, h) => s + Math.min(h.week_count, h.target_per_week), 0);
  const progress = totalTarget === 0 ? 0 : Math.min(1, totalDone / totalTarget);
  const pct = Math.round(progress * 100);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  const label =
    pct === 0 ? t("letsGo") :
    pct < 33  ? t("gettingStarted") :
    pct < 66  ? t("buildingMomentum") :
    pct < 100 ? t("almostThere") :
    t("weekComplete");

  return (
    <div className="flex items-center gap-6 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="relative flex-shrink-0">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius}
            fill="none" stroke="#7C9082" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-light text-[#2D3B35]">{pct}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">{t("label")}</p>
        <p className="text-2xl font-light text-[#2D3B35]">{totalDone}<span className="text-slate-400 text-base"> / {totalTarget}</span></p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ─── Flexible week dots ───────────────────────────────────────────────────────

function FlexibleProgress({ count, target }: { count: number; target: number }) {
  const dots = Array.from({ length: target }, (_, i) => i < count);
  return (
    <div className="flex gap-1 items-center">
      {dots.map((done, i) => (
        <div key={i} className={`w-2 h-2 rounded-full transition ${done ? "bg-[#7C9082]" : "bg-slate-200"}`} />
      ))}
      <span className="text-[10px] text-slate-400 ml-1">{count}/{target}×</span>
    </div>
  );
}

// ─── Specific days pill row ───────────────────────────────────────────────────

function SpecificDaysProgress({ scheduledDays, completedDays, weekCount }: {
  scheduledDays: number[];
  completedDays: Set<number>; // ISO weekdays done this week
  weekCount: number;
}) {
  const t = useTranslations("habits");
  const todayDow = todayIsoWeekday();
  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {days.map((d) => {
          const isScheduled = scheduledDays.includes(d);
          const isDone = completedDays.has(d);
          const isToday = d === todayDow;
          return (
            <div
              key={d}
              title={t(`days.${d}`)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium transition ${
                !isScheduled
                  ? "text-slate-200"
                  : isDone
                  ? "bg-[#7C9082] text-white"
                  : isToday
                  ? "ring-1 ring-[#7C9082] text-[#7C9082]"
                  : "ring-1 ring-slate-200 text-slate-400"
              }`}
            >
              {t(`days.${d}`).charAt(0)}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        {t("specificDaysProgress", { done: weekCount, total: scheduledDays.length })}
      </p>
    </div>
  );
}

// ─── Daily count progress ─────────────────────────────────────────────────────

function DailyCountProgress({ weekCount }: { weekCount: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full transition ${i < weekCount ? "bg-[#D4956A]" : "bg-slate-200"}`} />
      ))}
      <span className="text-[10px] text-slate-400 ml-1">{weekCount}/7d</span>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

type HonorState = { date: string; label: string; wasCompleted: boolean } | null;

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  return mon.toISOString().split("T")[0];
}

function HabitCalendar({ habitId, timesPerDay, onWeekCountChange, localeTag }: {
  habitId: string;
  timesPerDay: number;
  onWeekCountChange: (delta: number) => void;
  localeTag: string;
}) {
  const t = useTranslations("habits");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  // Map of date → count
  const [logMap, setLogMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [honor, setHonor] = useState<HonorState>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/habits/${habitId}/logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((entries: { date: string; count: number }[]) => {
        const map = new Map<string, number>();
        for (const e of entries) map.set(e.date, e.count);
        setLogMap(map);
        setLoading(false);
      });
  }, [habitId, year, month]);

  const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = now.toISOString().split("T")[0];
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function formatDayLabel(dateStr: string): string {
    return new Date(dateStr + "T12:00:00").toLocaleDateString(localeTag, {
      weekday: "long", month: "short", day: "numeric",
    });
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  }

  function handleDayClick(dateStr: string) {
    if (dateStr > todayStr) return;
    if (dateStr === todayStr) { toggleDate(dateStr); return; }
    const wasCompleted = (logMap.get(dateStr) ?? 0) >= timesPerDay;
    setHonor({ date: dateStr, label: formatDayLabel(dateStr), wasCompleted });
  }

  async function toggleDate(dateStr: string) {
    setToggling(true);
    setHonor(null);
    const currentCount = logMap.get(dateStr) ?? 0;
    const wasCompleted = currentCount >= timesPerDay;
    const res = await fetch(`/api/habits/${habitId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr }),
    });
    if (res.ok) {
      setLogMap((prev) => {
        const next = new Map(prev);
        if (next.has(dateStr)) next.delete(dateStr); else next.set(dateStr, 1);
        return next;
      });
      const weekStart = getWeekStart();
      if (dateStr >= weekStart && dateStr <= todayStr) {
        onWeekCountChange(wasCompleted ? -1 : 1);
      }
    }
    setToggling(false);
  }

  return (
    <div className="pt-3 pb-1 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="text-slate-400 hover:text-slate-600 text-sm px-1">‹</button>
        <span className="text-xs text-slate-500 font-medium">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="text-slate-400 hover:text-slate-600 text-sm px-1 disabled:opacity-30">›</button>
      </div>

      {honor && (
        <div className="bg-[#f5f8f5] border border-[#c8d5c9] rounded-xl px-4 py-3 space-y-2">
          <p className="text-xs text-[#2D3B35] font-medium">{honor.label}</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            {honor.wasCompleted ? t("honorSystem.confirmRemove") : t("honorSystem.confirmAdd")}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => toggleDate(honor.date)}
              disabled={toggling}
              className="flex-1 bg-[#7C9082] text-white py-1.5 rounded-lg text-xs hover:bg-[#6A7C70] disabled:opacity-50 transition"
            >
              {honor.wasCompleted ? t("honorSystem.yesRemove") : t("honorSystem.yesAdd")}
            </button>
            <button
              onClick={() => setHonor(null)}
              className="flex-1 border border-slate-200 text-slate-500 py-1.5 rounded-lg text-xs hover:border-slate-300 transition"
            >
              {honor.wasCompleted ? t("honorSystem.keep") : t("honorSystem.neverMind")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <span className="text-xs text-slate-300">{t("calendarLoading")}</span>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-y-1">
          {DAYS.map((d, i) => <div key={i} className="text-center text-[10px] text-slate-400 pb-1">{d}</div>)}
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isFuture = dateStr > todayStr;
            const isToday = dateStr === todayStr;
            const count = logMap.get(dateStr) ?? 0;
            const done = count >= timesPerDay;
            const partial = count > 0 && !done;
            const isPending = honor?.date === dateStr;

            return (
              <div key={day} className="flex items-center justify-center py-0.5">
                <button
                  disabled={isFuture || toggling}
                  onClick={() => handleDayClick(dateStr)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition ${
                    isFuture
                      ? "text-slate-200 cursor-default"
                      : isPending
                      ? "ring-2 ring-[#7C9082] text-[#7C9082]"
                      : done
                      ? "bg-[#7C9082] text-white hover:bg-[#6A7C70]"
                      : partial
                      ? "bg-[#D4956A]/30 text-[#D4956A] hover:bg-[#D4956A]/50"
                      : isToday
                      ? "ring-1 ring-[#7C9082] text-[#7C9082] hover:bg-[#7C9082]/10"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                >{day}</button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-300 text-center">{t("calendarHint")}</p>
    </div>
  );
}

// ─── Commitment selector ──────────────────────────────────────────────────────

function CommitmentSelector({ habitId, current, onChange }: {
  habitId: string; current: CommitmentLevel; onChange: (l: CommitmentLevel) => void;
}) {
  const t = useTranslations("habits.commitment");
  const levels: CommitmentLevel[] = ["gentle", "steady", "focused"];

  async function select(level: CommitmentLevel) {
    onChange(level);
    await fetch(`/api/habits/${habitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commitment_level: level }),
    });
  }

  return (
    <div className="pt-3 border-t border-slate-100">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{t("label")}</p>
      <div className="flex gap-2">
        {levels.map((level) => (
          <button key={level} onClick={() => select(level)} title={t(`${level}.description`)}
            className={`flex-1 py-1.5 rounded-lg text-xs border transition ${
              current === level ? "bg-[#7C9082] text-white border-[#7C9082]" : "border-slate-200 text-slate-500 hover:border-[#7C9082]"
            }`}
          >{COMMITMENT_ICONS[level]} {t(`${level}.label`)}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Streak badge ─────────────────────────────────────────────────────────────

function StreakBadge({ habitId }: { habitId: string }) {
  const t = useTranslations("habits");
  const [weeks, setWeeks] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/habits/${habitId}/streak`)
      .then((r) => r.json())
      .then((d) => setWeeks(d.weeks));
  }, [habitId]);

  if (weeks === null || weeks === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-[#7C9082]">
      <span>{t("streakBadge", { weeks })}</span>
    </div>
  );
}

// ─── Habit row ────────────────────────────────────────────────────────────────

function HabitRow({ habit, onToggle, onDailyCount, onDelete, onCommitmentChange, onWeekCountChange, localeTag }: {
  habit: Habit;
  onToggle: (h: Habit) => void;
  onDailyCount: (id: string, action: "increment" | "decrement") => void;
  onDelete: (id: string) => void;
  onCommitmentChange: (id: string, level: CommitmentLevel) => void;
  onWeekCountChange: (id: string, delta: number) => void;
  localeTag: string;
}) {
  const t = useTranslations("habits");
  const [expanded, setExpanded] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const isFocused = habit.commitment_level === "focused";
  const weekDone = habit.week_count >= habit.target_per_week;
  const todayIso = todayIsoWeekday();
  const isScheduledToday = habit.schedule_type === "specific_days"
    ? (habit.scheduled_days ?? []).includes(todayIso)
    : true;

  // Build completedDays set for specific_days (which ISO weekdays were done this week)
  // We approximate from week_count — the full set requires extra data; for now we derive from calendar
  // We'll pass an empty set and let the calendar handle truth; for the row display we show week_count
  const scheduledDays = habit.scheduled_days ?? [];

  const completedDaysApprox = new Set<number>(habit.completed_week_days);

  return (
    <div className={`rounded-xl border shadow-sm transition ${
      isFocused && !weekDone && (habit.schedule_type !== "specific_days" || isScheduledToday) && !habit.completed
        ? "border-amber-200 bg-amber-50/40"
        : "border-slate-100 bg-white"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3 group">

        {/* Left control — varies by schedule type */}
        {habit.schedule_type === "daily_count" ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onDailyCount(habit.id, "decrement")}
              disabled={habit.today_count === 0}
              className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-slate-400
                         hover:border-[#D4956A] hover:text-[#D4956A] disabled:opacity-30 transition text-xs"
            >−</button>
            <div className={`min-w-[36px] h-6 rounded-full px-1.5 flex items-center justify-center text-[10px] font-medium transition ${
              habit.completed
                ? "bg-[#7C9082] text-white"
                : habit.today_count > 0
                ? "bg-[#D4956A]/20 text-[#D4956A]"
                : "bg-slate-100 text-slate-400"
            }`}>
              {habit.today_count}/{habit.times_per_day}
            </div>
            <button
              onClick={() => onDailyCount(habit.id, "increment")}
              disabled={habit.completed}
              className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-slate-400
                         hover:border-[#7C9082] hover:text-[#7C9082] disabled:opacity-30 transition text-xs"
            >+</button>
          </div>
        ) : (
          <button
            onClick={() => isScheduledToday ? onToggle(habit) : undefined}
            disabled={!isScheduledToday}
            title={!isScheduledToday ? t("notScheduledToday") : undefined}
            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition ${
              habit.completed
                ? "bg-[#7C9082] border-[#7C9082]"
                : !isScheduledToday
                ? "border-slate-200 opacity-30 cursor-default"
                : "border-slate-300 hover:border-[#7C9082]"
            }`}
            aria-label={habit.completed ? t("ariaIncomplete") : t("ariaComplete")}
          >
            {habit.completed && (
              <svg viewBox="0 0 10 10" className="w-full h-full p-0.5" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        {/* Name + progress */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${habit.completed ? "text-slate-400 line-through" : "text-[#2D3B35]"}`}>
            {habit.name}
          </p>
          <div className="mt-1">
            {habit.schedule_type === "flexible" && (
              <FlexibleProgress count={habit.week_count} target={habit.target_per_week} />
            )}
            {habit.schedule_type === "specific_days" && (
              <SpecificDaysProgress
                scheduledDays={scheduledDays}
                completedDays={completedDaysApprox}
                weekCount={habit.week_count}
              />
            )}
            {habit.schedule_type === "daily_count" && (
              <DailyCountProgress weekCount={habit.week_count} />
            )}
          </div>
        </div>

        <span className="text-sm opacity-50">{COMMITMENT_ICONS[habit.commitment_level]}</span>

        <button onClick={() => setExpanded(e => !e)} className="text-slate-300 hover:text-slate-500 text-xs transition">
          {expanded ? "▴" : "▾"}
        </button>

        {showDelete ? (
          <div className="flex gap-2 items-center">
            <button onClick={() => onDelete(habit.id)} className="text-xs text-red-400 hover:text-red-600 transition">{t("deleteConfirm.yes")}</button>
            <button onClick={() => setShowDelete(false)} className="text-xs text-slate-400 hover:text-slate-600 transition">{t("deleteConfirm.no")}</button>
          </div>
        ) : (
          <button onClick={() => setShowDelete(true)}
            className="text-slate-200 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition text-lg leading-none"
          >×</button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          {!isScheduledToday && habit.schedule_type === "specific_days" && (
            <p className="text-xs text-slate-400 pt-3">{t("notScheduledToday")}</p>
          )}
          <StreakBadge habitId={habit.id} />
          <HabitCalendar
            habitId={habit.id}
            timesPerDay={habit.times_per_day}
            onWeekCountChange={(delta) => onWeekCountChange(habit.id, delta)}
            localeTag={localeTag}
          />
          <CommitmentSelector
            habitId={habit.id}
            current={habit.commitment_level}
            onChange={(l) => onCommitmentChange(habit.id, l)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Schedule type picker (used in add form) ──────────────────────────────────

function SchedulePicker({ value, onChange }: { value: ScheduleType; onChange: (s: ScheduleType) => void }) {
  const t = useTranslations("habits.schedule");
  const options: { type: ScheduleType; icon: string }[] = [
    { type: "flexible",      icon: "🔄" },
    { type: "specific_days", icon: "📅" },
    { type: "daily_count",   icon: "🔢" },
  ];
  const selectedDesc =
    value === "flexible" ? t("flexibleDesc") :
    value === "specific_days" ? t("specificDaysDesc") :
    t("dailyCountDesc");

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{t("label")}</p>
      <div className="flex gap-2">
        {options.map(({ type, icon }) => {
          const label = type === "flexible" ? t("flexible") : type === "specific_days" ? t("specificDays") : t("dailyCount");
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-xs transition ${
                value === type
                  ? "border-[#7C9082] bg-[#7C9082]/10 text-[#2D3B35]"
                  : "border-slate-200 text-slate-400 hover:border-[#7C9082]"
              }`}
            >
              <span className="text-base">{icon}</span>
              <span className="text-[10px] mt-0.5 text-center leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 text-center">{selectedDesc}</p>
    </div>
  );
}

// ─── Day of week picker ───────────────────────────────────────────────────────

function DayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const t = useTranslations("habits");
  const days = [1, 2, 3, 4, 5, 6, 7];

  function toggle(d: number) {
    onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort());
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{t("schedule.specificDaysDesc")}</p>
      <div className="flex gap-1.5">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={`flex-1 py-2 rounded-lg text-xs border transition ${
              value.includes(d)
                ? "bg-[#7C9082] text-white border-[#7C9082]"
                : "border-slate-200 text-slate-500 hover:border-[#7C9082]"
            }`}
          >{t(`days.${d}`)}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Times per week picker (flexible) ────────────────────────────────────────

function TargetPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const t = useTranslations("habits.targetPicker");
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{t("label")}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-lg text-xs border transition ${
              value === n ? "bg-[#7C9082] text-white border-[#7C9082]" : "border-slate-200 text-slate-500 hover:border-[#7C9082]"
            }`}
          >{n}</button>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-1 text-center">
        {value === 7 ? t("everyDay") : value === 1 ? t("onceAWeek") : t("xTimesAWeek", { count: value })}
      </p>
    </div>
  );
}

// ─── Times per day counter (daily_count) ─────────────────────────────────────

function TimesPerDayPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const t = useTranslations("habits.timesPerDay");
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{t("label")}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:border-[#7C9082] hover:text-[#7C9082] transition text-sm"
        >−</button>
        <span className="text-lg font-light text-[#2D3B35] w-8 text-center">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:border-[#7C9082] hover:text-[#7C9082] transition text-sm"
        >+</button>
        <span className="text-xs text-slate-400">{t("display", { count: value })}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const t = useTranslations("habits");
  const locale = useLocale();
  const localeTag = locale === "es" ? "es-MX" : "en-US";

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("flexible");
  const [newTarget, setNewTarget] = useState(7);
  const [newDays, setNewDays] = useState<number[]>([]);
  const [newTimesPerDay, setNewTimesPerDay] = useState(1);

  useEffect(() => {
    fetch("/api/habits")
      .then((r) => r.json())
      .then((data) => { setHabits(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleToggle(habit: Habit) {
    const willComplete = !habit.completed;
    setHabits((prev) => prev.map((h) => h.id === habit.id
      ? { ...h, completed: willComplete, week_count: Math.max(0, h.week_count + (willComplete ? 1 : -1)) }
      : h
    ));
    const res = await fetch(`/api/habits/${habit.id}`, { method: "POST" });
    if (!res.ok) setHabits((prev) => prev.map((h) => h.id === habit.id ? habit : h));
  }

  async function handleDailyCount(id: string, action: "increment" | "decrement") {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const newCount = action === "increment"
      ? habit.today_count + 1
      : Math.max(0, habit.today_count - 1);
    const newCompleted = newCount >= habit.times_per_day;
    const wasCompleted = habit.completed;

    setHabits((prev) => prev.map((h) => h.id === id
      ? {
          ...h,
          today_count: newCount,
          completed: newCompleted,
          week_count: h.week_count + (!wasCompleted && newCompleted ? 1 : wasCompleted && !newCompleted ? -1 : 0),
        }
      : h
    ));

    await fetch(`/api/habits/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!newName.trim()) return;
    if (scheduleType === "specific_days" && newDays.length === 0) return;
    setAdding(true);

    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        schedule_type: scheduleType,
        target_per_week: newTarget,
        scheduled_days: scheduleType === "specific_days" ? newDays : undefined,
        times_per_day: scheduleType === "daily_count" ? newTimesPerDay : undefined,
      }),
    });

    if (res.ok) {
      const habit = await res.json();
      setHabits((prev) => [...prev, habit]);
      resetForm();
    }
    setAdding(false);
  }

  function resetForm() {
    setNewName("");
    setScheduleType("flexible");
    setNewTarget(7);
    setNewDays([]);
    setNewTimesPerDay(1);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
  }

  function handleCommitmentChange(id: string, level: CommitmentLevel) {
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, commitment_level: level } : h));
  }

  function handleWeekCountChange(id: string, delta: number) {
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, week_count: Math.max(0, h.week_count + delta) } : h));
  }

  const completedCount = habits.filter((h) => h.completed).length;

  const canSubmit = newName.trim() &&
    (scheduleType !== "specific_days" || newDays.length > 0);

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-6">

        <div>
          <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-slate-500 text-sm">
            {habits.length === 0 ? t("subtitleEmpty") : t("subtitleCount", { completed: completedCount, total: habits.length })}
          </p>
        </div>

        {!loading && habits.length > 0 && <WeeklyRing habits={habits} />}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : habits.length > 0 ? (
          <div className="space-y-3">
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                onToggle={handleToggle}
                onDailyCount={handleDailyCount}
                onDelete={handleDelete}
                onCommitmentChange={handleCommitmentChange}
                onWeekCountChange={handleWeekCountChange}
                localeTag={localeTag}
              />
            ))}
          </div>
        ) : null}

        {showForm ? (
          <form onSubmit={handleAdd} className="space-y-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("addForm.placeholder")}
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-[#FDFCF8] text-[#2D3B35]
                         placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#7C9082] transition"
            />

            <SchedulePicker value={scheduleType} onChange={setScheduleType} />

            {scheduleType === "flexible" && (
              <TargetPicker value={newTarget} onChange={setNewTarget} />
            )}
            {scheduleType === "specific_days" && (
              <DayPicker value={newDays} onChange={setNewDays} />
            )}
            {scheduleType === "daily_count" && (
              <TimesPerDayPicker value={newTimesPerDay} onChange={setNewTimesPerDay} />
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding || !canSubmit}
                className="flex-1 bg-[#7C9082] text-white py-2 rounded-lg text-sm hover:bg-[#6A7C70] disabled:opacity-50 transition"
              >{adding ? t("addForm.saving") : t("addForm.addButton")}</button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-500 hover:border-slate-300 transition"
              >{t("addForm.cancelButton")}</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm
                       hover:border-[#7C9082] hover:text-[#7C9082] transition"
          >{t("addHabitTrigger")}</button>
        )}

      </div>
    </main>
  );
}
