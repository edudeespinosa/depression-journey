import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("therapist_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ therapist: data ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const full_name = (body.name as string | undefined)?.trim() || user.email?.split("@")[0] || "Therapist";

  const { data, error } = await supabase
    .from("therapist_profiles")
    .upsert({ user_id: user.id, full_name }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ therapist: data });
}
