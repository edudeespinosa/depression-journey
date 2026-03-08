import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { encrypt, safeDecrypt } from "@/lib/encryption";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("affirmations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((a) => ({ ...a, text: safeDecrypt(a.text) })));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, value_category, frequency, scheduled_days } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("affirmations")
    .insert({
      user_id: user.id,
      text: encrypt(text.trim()),
      value_category: value_category ?? "other",
      frequency: frequency ?? "daily",
      scheduled_days: scheduled_days ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, text: safeDecrypt(data.text) }, { status: 201 });
}
