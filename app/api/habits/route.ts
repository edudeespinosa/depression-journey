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

  const [{ data: habits }, { data: logs }, { data: weekLogs }] = await Promise.all([
    supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("habit_logs").select("habit_id").eq("user_id", user.id).eq("completed_at", today),
    supabase.from("habit_logs").select("habit_id").eq("user_id", user.id).gte("completed_at", monday).lte("completed_at", today),
  ]);

  const completedIds = new Set((logs ?? []).map((l) => l.habit_id));
  const weekCountMap = new Map<string, number>();
  for (const l of weekLogs ?? []) {
    weekCountMap.set(l.habit_id, (weekCountMap.get(l.habit_id) ?? 0) + 1);
  }

  return NextResponse.json(
    (habits ?? []).map((h) => ({
      ...h,
      completed: completedIds.has(h.id),
      week_count: weekCountMap.get(h.id) ?? 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, target_per_week } = await req.json();
  const target = Number(target_per_week);

  if (!name?.trim() || isNaN(target) || target < 1 || target > 7) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("habits")
    .insert({ user_id: user.id, name: name.trim(), target_per_week: target })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, completed: false, week_count: 0 }, { status: 201 });
}
