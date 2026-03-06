import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function weekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // shift to Mon
  const mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  return mon.toISOString().split("T")[0];
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const monday = weekStart();

  const [{ data: habits }, { data: todayLogs }, { data: weekLogs }] = await Promise.all([
    supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("habit_logs").select("habit_id, count").eq("user_id", user.id).eq("completed_at", today),
    supabase.from("habit_logs").select("habit_id, completed_at, count").eq("user_id", user.id).gte("completed_at", monday).lte("completed_at", today),
  ]);

  // Build today's log map: habit_id → count
  const todayCountMap = new Map<string, number>();
  for (const l of todayLogs ?? []) {
    todayCountMap.set(l.habit_id, l.count ?? 1);
  }

  // Build week count per habit (per-type logic applied in JS after we have habit info)
  // weekLogs keyed by habit_id → array of { completed_at, count }
  const weekLogsMap = new Map<string, { date: string; count: number }[]>();
  for (const l of weekLogs ?? []) {
    const arr = weekLogsMap.get(l.habit_id) ?? [];
    arr.push({ date: l.completed_at, count: l.count ?? 1 });
    weekLogsMap.set(l.habit_id, arr);
  }

  return NextResponse.json(
    (habits ?? []).map((h) => {
      const todayCount = todayCountMap.get(h.id) ?? 0;
      const scheduleType: string = h.schedule_type ?? "flexible";
      const timesPerDay: number = h.times_per_day ?? 1;
      const scheduledDays: number[] | null = h.scheduled_days ?? null;
      const logs = weekLogsMap.get(h.id) ?? [];

      let weekCount = 0;
      if (scheduleType === "flexible") {
        weekCount = logs.length; // distinct days (UNIQUE constraint guarantees this)
      } else if (scheduleType === "specific_days" && scheduledDays) {
        // Only count logs on scheduled days
        weekCount = logs.filter((l) => {
          const dow = new Date(l.date + "T12:00:00").getDay(); // 0=Sun
          const iso = dow === 0 ? 7 : dow; // convert to 1=Mon..7=Sun
          return scheduledDays.includes(iso);
        }).length;
      } else if (scheduleType === "daily_count") {
        // Count days where the habit was completed (count >= times_per_day)
        weekCount = logs.filter((l) => (l.count ?? 1) >= timesPerDay).length;
      }

      const completed =
        scheduleType === "daily_count"
          ? todayCount >= timesPerDay
          : todayCount > 0;

      // Which ISO weekdays (1=Mon..7=Sun) were logged this week — used by specific_days pill display
      const completedWeekDays: number[] = logs.map((l) => {
        const dow = new Date(l.date + "T12:00:00").getDay();
        return dow === 0 ? 7 : dow;
      });

      return {
        ...h,
        schedule_type: scheduleType,
        scheduled_days: scheduledDays,
        times_per_day: timesPerDay,
        today_count: todayCount,
        completed,
        week_count: weekCount,
        completed_week_days: completedWeekDays,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, schedule_type = "flexible", target_per_week, scheduled_days, times_per_day = 1 } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let targetPerWeek: number;
  if (schedule_type === "specific_days") {
    if (!Array.isArray(scheduled_days) || scheduled_days.length === 0) {
      return NextResponse.json({ error: "scheduled_days required" }, { status: 400 });
    }
    targetPerWeek = scheduled_days.length;
  } else if (schedule_type === "daily_count") {
    targetPerWeek = 7; // daily habit — target is every day
  } else {
    targetPerWeek = Number(target_per_week);
    if (isNaN(targetPerWeek) || targetPerWeek < 1 || targetPerWeek > 7) {
      return NextResponse.json({ error: "Invalid target_per_week" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      name: name.trim(),
      target_per_week: targetPerWeek,
      schedule_type,
      scheduled_days: schedule_type === "specific_days" ? scheduled_days : null,
      times_per_day: schedule_type === "daily_count" ? Number(times_per_day) : 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ...data,
    completed: false,
    week_count: 0,
    today_count: 0,
    completed_week_days: [],
  }, { status: 201 });
}
