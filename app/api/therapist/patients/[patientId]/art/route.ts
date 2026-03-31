import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { safeDecrypt } from "@/lib/encryption";

type Params = { params: Promise<{ patientId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { patientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify therapist-patient link with art sharing enabled
  const { data: link } = await supabase
    .from("patient_therapist_links")
    .select("share_art")
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .single();

  if (!link) return NextResponse.json({ error: "Not linked" }, { status: 403 });
  if (!link.share_art) return NextResponse.json({ blocked: true });

  const { data: sessions, error } = await supabase
    .from("art_sessions")
    .select("id, image_url, initial_note, created_at")
    .eq("user_id", patientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all((sessions ?? []).map(async (s) => {
    const { data: messages } = await supabase
      .from("art_messages")
      .select("id, role, content, created_at")
      .eq("session_id", s.id)
      .order("created_at", { ascending: true });

    return {
      ...s,
      initial_note: safeDecrypt(s.initial_note),
      messages: (messages ?? []).map((m) => ({ ...m, content: safeDecrypt(m.content) })),
    };
  }));

  return NextResponse.json(enriched);
}
