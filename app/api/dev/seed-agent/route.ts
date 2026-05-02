import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";

// ─── Scenario definitions ─────────────────────────────────────────────────────
//
// Each scenario exercises a different agent response type:
//   nudge       — no recent check-ins, habits slipping → agent prompts action
//   insight     — weekday anxiety pattern → agent names the pattern
//   celebration — 7-day streak + mood improving + all habits done → agent celebrates

type CheckinRow = { emotion: string; intensity: number; daysAgo: number; hour: number };
type HabitRow   = { name: string; target: number; completedDaysAgo: number[] };
type JournalRow = { mood: string; daysAgo: number };

type Scenario = {
  description: string;
  agentExpectation: string;
  checkins: CheckinRow[];
  habits: HabitRow[];
  journals: JournalRow[];
};

const SCENARIOS: Record<string, Scenario> = {
  // ── nudge ──────────────────────────────────────────────────────────────────
  // Last check-in 5 days ago, habits mostly skipped this week.
  // Agent should notice the gap and prompt a check-in or habit catch-up.
  nudge: {
    description: "Last check-in 5 days ago, habits slipping this week",
    agentExpectation: "Should surface a nudge toward checking in or completing habits",
    checkins: [
      { emotion: "Anxious",  intensity: 72, daysAgo: 5, hour: 9  },
      { emotion: "Sad",      intensity: 65, daysAgo: 7, hour: 20 },
      { emotion: "Tired",    intensity: 58, daysAgo: 9, hour: 8  },
      { emotion: "Confused", intensity: 50, daysAgo: 12, hour: 14 },
    ],
    habits: [
      { name: "Morning meditation", target: 5, completedDaysAgo: [10, 9, 8, 7] },   // nothing this week
      { name: "Evening walk",       target: 5, completedDaysAgo: [10, 9, 7, 6, 5] }, // nothing this week
    ],
    journals: [
      { mood: "okay", daysAgo: 6 },
      { mood: "low",  daysAgo: 9 },
    ],
  },

  // ── insight ───────────────────────────────────────────────────────────────
  // Anxious / Overwhelmed at high intensity Mon–Fri, calm on weekends.
  // Agent should detect the weekday stress pattern.
  insight: {
    description: "High anxiety Mon–Fri, noticeably calmer on weekends — 3 weeks of data",
    agentExpectation: "Should surface an insight about the weekday stress pattern",
    checkins: buildWeekdayAnxietyPattern(),
    habits: [
      { name: "Breathing exercises", target: 5, completedDaysAgo: [0, 1, 2, 3, 4, 7, 8, 9, 10, 11] },
      { name: "Digital detox hour",  target: 3, completedDaysAgo: [5, 6, 12, 13, 19, 20] },
    ],
    journals: [
      { mood: "okay", daysAgo: 1 },
      { mood: "okay", daysAgo: 3 },
      { mood: "okay", daysAgo: 8 },
    ],
  },

  // ── celebration ───────────────────────────────────────────────────────────
  // 7-day check-in streak ending today, mood improving (low → happy),
  // all habits completed today and most of the week.
  // Agent should celebrate the streak and positive trend.
  celebration: {
    description: "7-day check-in streak, mood trending from low to happy, habits on track",
    agentExpectation: "Should celebrate the streak and improvement",
    checkins: [
      { emotion: "Exhausted", intensity: 75, daysAgo: 6, hour: 8  },
      { emotion: "Sad",       intensity: 68, daysAgo: 5, hour: 9  },
      { emotion: "Anxious",   intensity: 60, daysAgo: 4, hour: 10 },
      { emotion: "Cautious",  intensity: 50, daysAgo: 3, hour: 9  },
      { emotion: "Hopeful",   intensity: 55, daysAgo: 2, hour: 8  },
      { emotion: "Happy",     intensity: 65, daysAgo: 1, hour: 9  },
      { emotion: "Proud",     intensity: 70, daysAgo: 0, hour: 8  },
    ],
    habits: [
      { name: "Morning walk",       target: 5, completedDaysAgo: [0, 1, 2, 3, 4, 7, 8, 9] },
      { name: "Gratitude journal",   target: 7, completedDaysAgo: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { name: "No phone after 9pm",  target: 5, completedDaysAgo: [0, 1, 2, 3, 4, 7, 8]  },
    ],
    journals: [
      { mood: "low",  daysAgo: 5 },
      { mood: "okay", daysAgo: 3 },
      { mood: "good", daysAgo: 1 },
    ],
  },
};

// Builds 3 weeks of weekday-high / weekend-low check-ins
function buildWeekdayAnxietyPattern(): CheckinRow[] {
  const rows: CheckinRow[] = [];
  for (let daysAgo = 0; daysAgo <= 20; daysAgo++) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;

    rows.push({
      emotion:   isWeekend ? "Hopeful"     : "Anxious",
      intensity: isWeekend ? 30 + Math.round(Math.random() * 20) : 65 + Math.round(Math.random() * 20),
      daysAgo,
      hour: 9,
    });
  }
  return rows;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scenarioKey = searchParams.get("scenario") ?? "nudge";
  const scenario = SCENARIOS[scenarioKey];

  if (!scenario) {
    return NextResponse.json(
      { error: `Unknown scenario. Available: ${Object.keys(SCENARIOS).join(", ")}` },
      { status: 400 }
    );
  }

  const userId = user.id;
  const now = new Date();

  // Clear agent-relevant tables for this user first
  await supabase.from("daily_checkins").delete().eq("user_id", userId);
  await supabase.from("habit_logs").delete().eq("user_id", userId);
  await supabase.from("habits").delete().eq("user_id", userId);
  await supabase.from("journal_entries").delete().eq("user_id", userId);

  // Insert check-ins
  const checkinRows = scenario.checkins.map(({ emotion, intensity, daysAgo, hour }) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return { user_id: userId, emotion, intensity, created_at: d.toISOString() };
  });

  const { error: checkinErr } = await supabase.from("daily_checkins").insert(checkinRows);
  if (checkinErr) return NextResponse.json({ error: checkinErr.message }, { status: 500 });

  // Insert habits + logs
  const habitMeta = scenario.habits.map(({ name, target }) => ({
    user_id: userId, name, target_per_week: target,
  }));

  const { data: insertedHabits, error: habitErr } = await supabase
    .from("habits")
    .insert(habitMeta)
    .select("id, name");

  if (habitErr || !insertedHabits) {
    return NextResponse.json({ error: habitErr?.message ?? "habit insert failed" }, { status: 500 });
  }

  const logRows: { habit_id: string; user_id: string; completed_at: string }[] = [];
  for (const inserted of insertedHabits) {
    const def = scenario.habits.find((h) => h.name === inserted.name);
    if (!def) continue;
    for (const daysAgo of def.completedDaysAgo) {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      logRows.push({ habit_id: inserted.id, user_id: userId, completed_at: d.toISOString().split("T")[0] });
    }
  }

  if (logRows.length > 0) {
    const { error: logsErr } = await supabase.from("habit_logs").insert(logRows);
    if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 });
  }

  // Insert minimal journal entries (mood only — no content needed for agent)
  const journalRows = scenario.journals.map(({ mood, daysAgo }) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(20, 0, 0, 0);
    return { user_id: userId, mood, content: encrypt(""), ai_response: encrypt(""), created_at: d.toISOString() };
  });

  const { error: journalErr } = await supabase.from("journal_entries").insert(journalRows);
  if (journalErr) return NextResponse.json({ error: journalErr.message }, { status: 500 });

  return NextResponse.json({
    scenario: scenarioKey,
    description: scenario.description,
    agentExpectation: scenario.agentExpectation,
    seeded: {
      checkins: checkinRows.length,
      habits: insertedHabits.length,
      habitLogs: logRows.length,
      journals: journalRows.length,
    },
  });
}

export async function GET() {
  return NextResponse.json({
    usage: "POST /api/dev/seed-agent?scenario=<name>",
    available: Object.fromEntries(
      Object.entries(SCENARIOS).map(([k, v]) => [k, { description: v.description, expects: v.agentExpectation }])
    ),
  });
}
