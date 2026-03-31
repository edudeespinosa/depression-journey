import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { safeDecrypt } from "@/lib/encryption";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session, error } = await supabase
    .from("art_sessions")
    .select("id, image_url, initial_note, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("art_messages")
    .select("id, role, content, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ...session,
    initial_note: safeDecrypt(session.initial_note),
    messages: (messages ?? []).map((m) => ({ ...m, content: safeDecrypt(m.content) })),
  });
}
