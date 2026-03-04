import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commitment_level } = await req.json();
  if (!["gentle", "steady", "focused"].includes(commitment_level)) {
    return NextResponse.json({ error: "Invalid commitment level" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("habits")
    .update({ commitment_level })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Toggle completion for a given date (defaults to today)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const today = new Date().toISOString().split("T")[0];
  const date: string = body.date ?? today;

  // Reject future dates
  if (date > today) {
    return NextResponse.json({ error: "Cannot log future dates" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", id)
    .eq("completed_at", date)
    .single();

  if (existing) {
    await supabase.from("habit_logs").delete().eq("id", existing.id);
    return NextResponse.json({ completed: false, date });
  } else {
    await supabase
      .from("habit_logs")
      .insert({ habit_id: id, user_id: user.id, completed_at: date });
    return NextResponse.json({ completed: true, date });
  }
}
