import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get habit target
  const { data: habit } = await supabase
    .from("habits")
    .select("target_per_week")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!habit) return NextResponse.json({ weeks: 0 });

  // Fetch logs from the past 24 weeks
  const since = new Date();
  since.setDate(since.getDate() - 24 * 7);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("completed_at")
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .gte("completed_at", sinceStr);

  // Group logs by week (using Monday as week start)
  const weekMap = new Map<string, number>();
  for (const log of logs ?? []) {
    const monday = getMondayOf(new Date(log.completed_at));
    weekMap.set(monday, (weekMap.get(monday) ?? 0) + 1);
  }

  // Count consecutive completed weeks going backwards from last week
  // (current week is in-progress, only count it if target is already met)
  const thisMonday = getMondayOf(new Date());
  let streak = 0;

  // Check if current week already meets target
  if ((weekMap.get(thisMonday) ?? 0) >= habit.target_per_week) {
    streak = 1;
  }

  // Walk back through previous weeks
  const cursor = new Date(thisMonday);
  cursor.setDate(cursor.getDate() - 7);

  for (let i = 0; i < 23; i++) {
    const monday = cursor.toISOString().split("T")[0];
    const count = weekMap.get(monday) ?? 0;
    if (count >= habit.target_per_week) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }

  return NextResponse.json({ weeks: streak });
}
