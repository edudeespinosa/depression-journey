import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeDecrypt } from "@/lib/encryption";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, content, ai_response, mood, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((e) => ({
    ...e,
    content: safeDecrypt(e.content),
    ai_response: safeDecrypt(e.ai_response),
  })));
}
