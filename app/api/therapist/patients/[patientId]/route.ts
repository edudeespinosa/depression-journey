import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { safeDecrypt } from "@/lib/encryption";

type Params = { params: Promise<{ patientId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { patientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify active link + permissions
  const { data: link } = await supabase
    .from("patient_therapist_links")
    .select("share_emotions, share_thought_records, share_journals, share_habits")
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .single();

  if (!link) return NextResponse.json({ error: "Not linked" }, { status: 403 });

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(patientId);
  const displayName = authUser?.user?.email?.split("@")[0] ?? patientId.slice(0, 8);

  const [checkinsRes, thoughtsRes, habitsRes, logsRes, journalRes] = await Promise.all([
    link.share_emotions
      ? supabase.from("daily_checkins").select("emotion, intensity, created_at").eq("user_id", patientId).order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
    link.share_thought_records
      ? supabase.from("thought_records").select("*").eq("user_id", patientId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    link.share_habits
      ? supabase.from("habits").select("id, name, target_per_week, schedule_type, scheduled_days, times_per_day").eq("user_id", patientId)
      : Promise.resolve({ data: [] }),
    link.share_habits
      ? supabase.from("habit_logs").select("habit_id, completed_at, count").eq("user_id", patientId)
      : Promise.resolve({ data: [] }),
    link.share_journals
      ? supabase.from("journal_entries").select("id, content, mood, created_at").eq("user_id", patientId).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  // Compute week_count per habit
  const today = new Date().toISOString().split("T")[0];
  const monday = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().split("T")[0];
  })();

  const habits = (habitsRes.data ?? []).map((h) => {
    const logs = (logsRes.data ?? []).filter(
      (l) => l.habit_id === h.id && l.completed_at >= monday && l.completed_at <= today
    );
    const todayLog = logs.find((l) => l.completed_at === today);
    return {
      ...h,
      today_count: todayLog?.count ?? 0,
      completed: (todayLog?.count ?? 0) > 0,
      week_count: logs.length,
    };
  });

  const TR_FIELDS = ["situation", "automatic_thought", "evidence_for", "evidence_against", "balanced_thought", "outcome_emotion"] as const;
  const thought_records = (thoughtsRes.data ?? []).map((r) => {
    const d = { ...r };
    for (const f of TR_FIELDS) if (d[f]) d[f] = safeDecrypt(d[f]);
    return d;
  });
  const journal_entries = (journalRes.data ?? []).map((e) => ({ ...e, content: safeDecrypt(e.content) }));

  return NextResponse.json({
    display_name: displayName,
    checkins: checkinsRes.data ?? [],
    thought_records,
    habits,
    journal_entries,
    permissions: {
      share_emotions: link.share_emotions,
      share_thought_records: link.share_thought_records,
      share_journals: link.share_journals,
      share_habits: link.share_habits,
    },
  });
}
