import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent, DEFAULT_SUGGESTION } from "@/lib/agent-server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const suggestion = await runAgent(user.id, supabase);
    return NextResponse.json(suggestion);
  } catch (err) {
    console.error("[agent/route] error:", err);
    return NextResponse.json(DEFAULT_SUGGESTION);
  }
}
