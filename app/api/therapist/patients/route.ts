import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function computeStreak(checkins: { created_at: string }[]): number {
  if (!checkins.length) return 0;
  const days = Array.from(
    new Set(checkins.map((c) => c.created_at.split("T")[0]))
  ).sort((a, b) => b.localeCompare(a));

  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let cursor = today;

  for (const day of days) {
    if (day === cursor) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().split("T")[0];
    } else {
      break;
    }
  }
  return streak;
}

function computeMoodTrend(checkins: { intensity: number; created_at: string }[]): "improving" | "stable" | "declining" | null {
  if (checkins.length < 4) return null;
  const sorted = [...checkins].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const half = Math.floor(sorted.length / 2);
  const earlier = sorted.slice(0, half).reduce((s, c) => s + c.intensity, 0) / half;
  const later = sorted.slice(half).reduce((s, c) => s + c.intensity, 0) / (sorted.length - half);
  const delta = later - earlier;
  if (delta < -5) return "improving";   // lower intensity = better mood
  if (delta > 5) return "declining";
  return "stable";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify therapist
  const { data: profile } = await supabase.from("therapist_profiles").select("user_id").eq("user_id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Not a therapist" }, { status: 403 });

  // Get linked patients
  const { data: links, error: linksError } = await supabase
    .from("patient_therapist_links")
    .select("patient_id, share_emotions, share_thought_records, share_journals, share_habits")
    .eq("therapist_id", user.id)
    .eq("status", "active");

  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });
  if (!links?.length) return NextResponse.json([]);

  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const results = await Promise.all(
    links.map(async (link) => {
      const { data: authUser } = await admin.auth.admin.getUserById(link.patient_id);
      const displayName = authUser?.user?.email?.split("@")[0] ?? link.patient_id.slice(0, 8);

      // Last 14 checkins for streak + trend
      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("emotion, intensity, created_at")
        .eq("user_id", link.patient_id)
        .order("created_at", { ascending: false })
        .limit(14);

      // Latest habit completion for today
      const { data: habits } = await supabase
        .from("habits")
        .select("id")
        .eq("user_id", link.patient_id);

      const { data: todayLogs } = await supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", link.patient_id)
        .eq("completed_at", today);

      const streak = computeStreak(checkins ?? []);
      const moodTrend = computeMoodTrend(checkins ?? []);
      const lastCheckin = checkins?.[0]?.created_at?.split("T")[0] ?? null;

      return {
        patient_id: link.patient_id,
        display_name: displayName,
        last_checkin: lastCheckin,
        checkin_streak: streak,
        mood_trend: moodTrend,
        habits_today: todayLogs?.length ?? 0,
        habits_total: habits?.length ?? 0,
        share_emotions: link.share_emotions,
        share_thought_records: link.share_thought_records,
        share_journals: link.share_journals,
        share_habits: link.share_habits,
      };
    })
  );

  return NextResponse.json(results);
}
