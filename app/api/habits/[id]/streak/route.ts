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

function getIsoWeekday(dateStr: string): number {
  const dow = new Date(dateStr + "T12:00:00").getDay(); // 0=Sun
  return dow === 0 ? 7 : dow; // 1=Mon..7=Sun
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: habit } = await supabase
    .from("habits")
    .select("target_per_week, schedule_type, scheduled_days, times_per_day")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!habit) return NextResponse.json({ weeks: 0 });

  const scheduleType: string = habit.schedule_type ?? "flexible";
  const timesPerDay: number = habit.times_per_day ?? 1;
  const scheduledDays: number[] | null = habit.scheduled_days ?? null;

  // Fetch logs from the past 24 weeks
  const since = new Date();
  since.setDate(since.getDate() - 24 * 7);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("completed_at, count")
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .gte("completed_at", sinceStr);

  // Group logs by week — value = number of qualifying days
  const weekMap = new Map<string, number>();
  for (const log of logs ?? []) {
    const monday = getMondayOf(new Date(log.completed_at));
    const logCount = log.count ?? 1;

    let qualifies = false;
    if (scheduleType === "flexible") {
      qualifies = true; // any log counts
    } else if (scheduleType === "specific_days" && scheduledDays) {
      qualifies = scheduledDays.includes(getIsoWeekday(log.completed_at));
    } else if (scheduleType === "daily_count") {
      qualifies = logCount >= timesPerDay;
    }

    if (qualifies) {
      weekMap.set(monday, (weekMap.get(monday) ?? 0) + 1);
    }
  }

  const thisMonday = getMondayOf(new Date());
  let streak = 0;

  if ((weekMap.get(thisMonday) ?? 0) >= habit.target_per_week) {
    streak = 1;
  }

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
