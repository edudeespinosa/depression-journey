import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeDecrypt } from "@/lib/encryption";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("daily_checkins")
    .select("id, emotion, intensity, ai_response, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(90);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((c) => ({ ...c, ai_response: safeDecrypt(c.ai_response) })));
}
