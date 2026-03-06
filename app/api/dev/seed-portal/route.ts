import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// ─── Alex: improving arc (anxious → hopeful) ──────────────────────────────────
const ALEX_CHECKINS: [number, string, number, string][] = [
  [30, "Anxious",     82, "What is the difference between the worry and what's actually true right now?"],
  [29, "Overwhelmed", 78, "What would 'just enough' look like today?"],
  [28, "Sad",         70, "What would you want someone to truly understand about this?"],
  [27, "Anxious",     74, "Where do you feel this anxiety most in your body?"],
  [26, "Exhausted",   68, "What has been asking the most of you lately?"],
  [25, "Frustrated",  65, "What expectation sits at the heart of this frustration?"],
  [24, "Anxious",     72, "What story are you telling yourself about what might happen?"],
  [23, "Lonely",      60, "What kind of connection are you craving most right now?"],
  [22, "Overwhelmed", 63, "If you could set down just one thing, what would it be?"],
  [21, "Cautious",    55, "What are you most trying to protect yourself from?"],
  [20, "Sad",         58, "What does this sadness want you to pay attention to?"],
  [19, "Anxious",     50, "What is one thing entirely within your control right now?"],
  [18, "Confused",    48, "What do you know for certain in the middle of this uncertainty?"],
  [17, "Exhausted",   44, "What would rest actually look like for you?"],
  [16, "Cautious",    42, "What are you weighing as you decide how to move forward?"],
  [15, "Hopeful",     45, "What small sign made hope feel possible today?"],
  [14, "Confused",    40, "If your confusion could speak, what question would it most want answered?"],
  [13, "Hopeful",     50, "What possibility are you most drawn to right now?"],
  [12, "Cautious",    38, "What would it look like to trust yourself a little more?"],
  [11, "Hopeful",     55, "What would you do differently if you fully trusted this feeling?"],
  [10, "Happy",       58, "What made today feel different in a good way?"],
  [9,  "Hopeful",     62, "What are you most looking forward to?"],
  [8,  "Confident",   55, "What helped you arrive at this confidence?"],
  [7,  "Happy",       65, "What is this happiness pointing you toward?"],
  [6,  "Hopeful",     60, "What would you do if you knew this hope was trustworthy?"],
  [5,  "Confident",   68, "What does this confidence make possible that didn't feel available before?"],
  [4,  "Happy",       70, "What about today felt most alive to you?"],
  [3,  "Confident",   72, "What does staying with this feel like?"],
  [2,  "Hopeful",     68, "What are you most grateful for today?"],
  [1,  "Happy",       74, "What would you want to remember about today?"],
];

const ALEX_HABITS: [string, number, number[]][] = [
  ["Morning meditation", 3, [0, 2, 4, 7, 9, 11, 14, 16, 18]],
  ["Evening walk",       5, [0, 1, 3, 4, 5, 7, 8, 10, 11, 13, 14, 15, 17, 18]],
  ["Journaling",         4, [0, 1, 3, 6, 7, 10, 13, 14, 17, 20]],
];

const ALEX_THOUGHTS = [
  {
    daysAgo: 25,
    situation: "Got feedback at work that my project was behind schedule.",
    automatic_thought: "I'm failing and everyone can see it.",
    emotion: "ashamed",
    intensity: 8,
    evidence_for: "The deadline was missed. My manager looked disappointed.",
    evidence_against: "I've delivered on time before. One miss doesn't define me. I was juggling extra tasks.",
    balanced_thought: "I missed this deadline, but I have a solid track record. I can catch up and talk to my manager.",
    outcome_emotion: "calmer",
    outcome_intensity: 4,
  },
  {
    daysAgo: 15,
    situation: "Friend didn't reply to my message for two days.",
    automatic_thought: "They're avoiding me. I must have done something wrong.",
    emotion: "anxious",
    intensity: 7,
    evidence_for: "Two days is a long time. They usually reply faster.",
    evidence_against: "They've been busy with their move. They replied warmly when they did.",
    balanced_thought: "People get busy. It wasn't about me. I can reach out again if I'm still worried.",
    outcome_emotion: "relieved",
    outcome_intensity: 3,
  },
  {
    daysAgo: 5,
    situation: "Felt nervous before a presentation.",
    automatic_thought: "I'm going to blank out and embarrass myself.",
    emotion: "anxious",
    intensity: 6,
    evidence_for: "I've felt nervous before presentations before.",
    evidence_against: "I've always managed. The last three presentations went fine.",
    balanced_thought: "Nerves are normal. I've prepared well and I know this topic.",
    outcome_emotion: "confident",
    outcome_intensity: 3,
  },
];

// ─── Sam: struggling arc (heavy → cautious/starting to open) ─────────────────
const SAM_CHECKINS: [number, string, number, string][] = [
  [30, "Depressed",   88, "What has been weighing on you most heavily?"],
  [28, "Exhausted",   82, "What would rest actually look like for you today?"],
  [26, "Sad",         80, "What would you want someone to truly understand?"],
  [24, "Overwhelmed", 85, "If you could set down just one thing, what would it be?"],
  [22, "Anxious",     78, "Where do you feel this anxiety in your body?"],
  [20, "Depressed",   82, "What is one small thing that felt okay today?"],
  [18, "Sad",         75, "What does this sadness want you to notice?"],
  [16, "Exhausted",   70, "What has been asking the most of you?"],
  [14, "Frustrated",  72, "What expectation keeps getting crossed?"],
  [12, "Overwhelmed", 68, "What would 'just enough' look like today?"],
  [10, "Cautious",    62, "What are you weighing as you think about moving forward?"],
  [8,  "Confused",    60, "What do you know for certain right now?"],
  [6,  "Cautious",    55, "What feels slightly more possible today?"],
  [4,  "Sad",         58, "What would you want to be different?"],
  [2,  "Cautious",    50, "What small step feels manageable today?"],
  [0,  "Hopeful",     45, "What made this glimmer of hope feel possible?"],
];

const SAM_HABITS: [string, number, number[]][] = [
  ["Short walk",           3, [0, 3, 7, 10, 14, 18]],
  ["Breathing exercises",  5, [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14, 15]],
];

const SAM_THOUGHTS = [
  {
    daysAgo: 20,
    situation: "Stayed in bed most of the day instead of doing planned tasks.",
    automatic_thought: "I'm completely useless. Nothing will ever change.",
    emotion: "depressed",
    intensity: 9,
    evidence_for: "I didn't do the things I wanted to do. This has happened before.",
    evidence_against: "I'm here and I tried. Depression makes everything harder. I have had better days.",
    balanced_thought: "I'm struggling right now, but struggling isn't the same as failing. I can try one small thing tomorrow.",
    outcome_emotion: "a little less hopeless",
    outcome_intensity: 6,
  },
  {
    daysAgo: 8,
    situation: "Noticed I went for a walk two days in a row.",
    automatic_thought: "It probably doesn't matter. I'll just stop again anyway.",
    emotion: "cautious",
    intensity: 5,
    evidence_for: "I've tried building habits before and stopped.",
    evidence_against: "Two days in a row is real. The walk did feel better than staying inside.",
    balanced_thought: "Two days is two days. I don't have to predict the future — I can just try for a third.",
    outcome_emotion: "slightly hopeful",
    outcome_intensity: 4,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoDate(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateOnly(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ─── POST: seed portal demo ───────────────────────────────────────────────────
export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local. Add it and restart the dev server." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // 1. Create or retrieve test patient users
  async function upsertPatient(email: string) {
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users.find((u) => u.email === email);
    if (found) return found.id;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "demo1234",
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? "Failed to create user");
    return data.user.id;
  }

  let alexId: string;
  let samId: string;

  try {
    alexId = await upsertPatient("alex@demo.phantom");
    samId = await upsertPatient("sam@demo.phantom");
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // 2. Make current user a therapist (upsert)
  await supabase.from("therapist_profiles").upsert({
    user_id: user.id,
    full_name: "Dr. Demo",
  }, { onConflict: "user_id" });

  // 3. Seed Alex's data
  await seedPatient(admin, alexId, ALEX_CHECKINS, ALEX_HABITS, ALEX_THOUGHTS);

  // 4. Seed Sam's data
  await seedPatient(admin, samId, SAM_CHECKINS, SAM_HABITS, SAM_THOUGHTS);

  // 5. Link patients to therapist (delete existing first to avoid conflict issues)
  await admin.from("patient_therapist_links").delete().in("patient_id", [alexId, samId]);
  const randCode = () => Math.random().toString(36).slice(2, 10);
  const { error: linkError } = await admin.from("patient_therapist_links").insert([
    { patient_id: alexId, therapist_id: user.id, status: "active", invite_code: randCode(), share_emotions: true, share_thought_records: true, share_journals: true, share_habits: true },
    { patient_id: samId,  therapist_id: user.id, status: "active", invite_code: randCode(), share_emotions: true, share_thought_records: true, share_journals: false, share_habits: true },
  ]);

  if (linkError) return NextResponse.json({ error: `Links failed: ${linkError.message}` }, { status: 500 });
  return NextResponse.json({ success: true, patients: ["alex", "sam"] });
}

async function seedPatient(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  checkins: [number, string, number, string][],
  habits: [string, number, number[]][],
  thoughts: typeof ALEX_THOUGHTS,
) {
  // Clear existing data for this patient first
  await admin.from("habit_logs").delete().eq("user_id", userId);
  await admin.from("habits").delete().eq("user_id", userId);
  await admin.from("daily_checkins").delete().eq("user_id", userId);
  await admin.from("thought_records").delete().eq("user_id", userId);

  // Checkins
  const checkinRows = checkins.map(([daysAgo, emotion, intensity, ai_response]) => ({
    user_id: userId,
    emotion,
    intensity,
    ai_response,
    created_at: daysAgoDate(daysAgo, 9 + Math.floor(Math.random() * 4)),
  }));
  await admin.from("daily_checkins").insert(checkinRows);

  // Habits
  const habitMeta = habits.map(([name, target_per_week]) => ({
    user_id: userId,
    name,
    target_per_week,
    schedule_type: "flexible",
    times_per_day: 1,
  }));
  const { data: insertedHabits } = await admin.from("habits").insert(habitMeta).select("id, name");

  if (insertedHabits) {
    const logRows: { habit_id: string; user_id: string; completed_at: string }[] = [];
    for (const inserted of insertedHabits) {
      const seed = habits.find(([name]) => name === inserted.name);
      if (!seed) continue;
      for (const daysAgo of seed[2]) {
        logRows.push({ habit_id: inserted.id, user_id: userId, completed_at: dateOnly(daysAgo) });
      }
    }
    if (logRows.length > 0) await admin.from("habit_logs").insert(logRows);
  }

  // Thought records
  const thoughtRows = thoughts.map((t) => ({
    user_id: userId,
    situation: t.situation,
    automatic_thought: t.automatic_thought,
    emotion: t.emotion,
    intensity: t.intensity,
    evidence_for: t.evidence_for ?? null,
    evidence_against: t.evidence_against ?? null,
    balanced_thought: t.balanced_thought ?? null,
    outcome_emotion: t.outcome_emotion ?? null,
    outcome_intensity: t.outcome_intensity ?? null,
    created_at: daysAgoDate(t.daysAgo, 20),
  }));
  await admin.from("thought_records").insert(thoughtRows);
}

// ─── DELETE: clear portal seed data ──────────────────────────────────────────
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Find and delete test patient users (cascade deletes their data)
  const { data: existing } = await admin.auth.admin.listUsers();
  const testEmails = ["alex@demo.phantom", "sam@demo.phantom"];
  for (const u of existing?.users ?? []) {
    if (testEmails.includes(u.email ?? "")) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }

  // Remove therapist profile for current user
  await supabase.from("therapist_profiles").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true, cleared: true });
}
