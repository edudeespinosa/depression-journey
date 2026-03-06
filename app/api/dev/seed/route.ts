import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ─── Check-in seed data ───────────────────────────────────────────────────────
// Arc: heavier emotions early → lighter/more hopeful toward today
// [daysAgo, emotion, intensity, hour, ai_response]
const CHECKINS: [number, string, number, number, string][] = [
  [30, "Exhausted",   78, 8,  "What is it about this tiredness that feels different from just physical fatigue?"],
  [29, "Anxious",     65, 21, "When you notice this anxiety, where do you feel it most in your body?"],
  [28, "Sad",         72, 9,  "What would it mean to you to let yourself fully feel this sadness today?"],
  [27, "Overwhelmed", 82, 20, "If you could set down just one thing you're carrying right now, what would it be?"],
  [26, "Frustrated",  68, 15, "What expectation — yours or someone else's — sits at the heart of this frustration?"],
  [25, "Exhausted",   58, 8,  "What has been asking the most of you lately?"],
  [24, "Lonely",      74, 22, "What kind of connection are you craving most right now?"],
  [23, "Sad",         62, 10, "What would you want someone to truly understand about what you're going through?"],
  [22, "Anxious",     70, 19, "What story are you telling yourself about what might happen?"],
  [21, "Confused",    55, 14, "If your confusion could speak, what question would it most want answered?"],
  [20, "Overwhelmed", 65, 9,  "What would 'just enough' look like today, instead of trying to do everything?"],
  [19, "Exhausted",   52, 7,  "What does rest actually look like for you, and what is getting in the way of it?"],
  [18, "Cautious",    48, 18, "What are you most trying to protect yourself from right now?"],
  [17, "Sad",         58, 11, "What does this sadness want you to pay attention to?"],
  [16, "Frustrated",  72, 16, "What boundary keeps getting crossed, and what would honoring it look like?"],
  [15, "Hopeful",     42, 9,  "What small sign made hope feel possible today?"],
  [14, "Confused",    45, 13, "What do you know for certain, even in the middle of all this uncertainty?"],
  [13, "Anxious",     52, 20, "What is the difference between what you're worried about and what's actually true right now?"],
  [12, "Hopeful",     55, 8,  "What possibility are you most drawn to right now?"],
  [11, "Cautious",    40, 17, "What are you weighing as you decide how to move forward?"],
  [10, "Hopeful",     62, 9,  "What would you do differently if you fully trusted this feeling of hope?"],
  [9,  "Happy",       65, 10, "What made today feel different in a good way?"],
  [8,  "Exhausted",   44, 8,  "What would it feel like to give yourself permission to truly slow down?"],
  [7,  "Confident",   60, 11, "What helped you arrive at this confidence, and how can you carry it forward?"],
  [6,  "Happy",       70, 9,  "What is this happiness pointing you toward?"],
  [5,  "Hopeful",     67, 10, "What would you do if you knew this hope was trustworthy?"],
  [4,  "Anxious",     38, 19, "What is one thing entirely within your control right now?"],
  [3,  "Confident",   72, 9,  "What does this confidence make possible that didn't feel available before?"],
  [2,  "Happy",       75, 10, "What about today felt most alive to you?"],
  [1,  "Hopeful",     70, 8,  "What are you most looking forward to, and what would it mean if it came true?"],
  [0,  "Proud",       68, 9,  "What does this pride tell you about what matters most to you?"],
];

// ─── Habit seed data ──────────────────────────────────────────────────────────
// [name, target_per_week, commitment_level, completedDaysAgo[]]
const HABITS: [string, number, string, number[]][] = [
  [
    "Morning meditation",
    3,
    "gentle",
    [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25],
  ],
  [
    "Evening walk",
    5,
    "steady",
    [0, 1, 3, 4, 5, 7, 8, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26],
  ],
  [
    "Journaling",
    4,
    "steady",
    [0, 1, 3, 6, 7, 8, 10, 13, 14, 15, 17, 20, 21, 22, 24, 27],
  ],
  [
    "Gratitude practice",
    7,
    "focused",
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 26, 27, 28],
  ],
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();

  // ── Insert check-ins ──────────────────────────────────────────────────────
  const checkinRows = CHECKINS.map(([daysAgo, emotion, intensity, hour, ai_response]) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, Math.floor(Math.random() * 30), 0, 0);
    return { user_id: user.id, emotion, intensity, ai_response, created_at: date.toISOString() };
  });

  const { error: checkinError } = await supabase.from("daily_checkins").insert(checkinRows);
  if (checkinError) {
    return NextResponse.json({ error: checkinError.message }, { status: 500 });
  }

  // ── Insert habits ─────────────────────────────────────────────────────────
  const habitMeta = HABITS.map(([name, target_per_week, commitment_level]) => ({
    user_id: user.id,
    name,
    target_per_week,
    commitment_level,
  }));

  const { data: insertedHabits, error: habitError } = await supabase
    .from("habits")
    .insert(habitMeta)
    .select("id, name");

  if (habitError || !insertedHabits) {
    return NextResponse.json({ error: habitError?.message ?? "Habit insert failed" }, { status: 500 });
  }

  // ── Insert habit logs ─────────────────────────────────────────────────────
  const logRows: { habit_id: string; user_id: string; completed_at: string }[] = [];

  for (const inserted of insertedHabits) {
    const seedEntry = HABITS.find(([name]) => name === inserted.name);
    if (!seedEntry) continue;
    const completedDaysAgo = seedEntry[3] as number[];

    for (const daysAgo of completedDaysAgo) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      logRows.push({
        habit_id: inserted.id,
        user_id: user.id,
        completed_at: date.toISOString().split("T")[0],
      });
    }
  }

  const { error: logsError } = await supabase.from("habit_logs").insert(logRows);
  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    checkins: checkinRows.length,
    habits: insertedHabits.length,
    logs: logRows.length,
  });
}

// ─── Clear seed data ──────────────────────────────────────────────────────────
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await supabase.from("daily_checkins").delete().eq("user_id", user.id);
  await supabase.from("habit_logs").delete().eq("user_id", user.id);
  await supabase.from("habits").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true, cleared: true });
}
