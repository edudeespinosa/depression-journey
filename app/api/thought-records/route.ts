import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { encrypt, safeDecrypt } from "@/lib/encryption";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("thought_records")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const TEXT_FIELDS = ["situation", "automatic_thought", "evidence_for", "evidence_against", "balanced_thought", "outcome_emotion"] as const;
  return NextResponse.json((data ?? []).map((r) => {
    const decrypted = { ...r };
    for (const f of TEXT_FIELDS) decrypted[f] = safeDecrypt(r[f]);
    return decrypted;
  }));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    situation,
    automatic_thought,
    emotion,
    intensity,
    evidence_for,
    evidence_against,
    balanced_thought,
    outcome_emotion,
    outcome_intensity,
  } = body;

  if (!situation?.trim() || !automatic_thought?.trim() || !emotion?.trim() || !intensity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("thought_records")
    .insert({
      user_id: user.id,
      situation: encrypt(situation.trim()),
      automatic_thought: encrypt(automatic_thought.trim()),
      emotion: emotion.trim(),
      intensity: Number(intensity),
      evidence_for: evidence_for?.trim() ? encrypt(evidence_for.trim()) : null,
      evidence_against: evidence_against?.trim() ? encrypt(evidence_against.trim()) : null,
      balanced_thought: balanced_thought?.trim() ? encrypt(balanced_thought.trim()) : null,
      outcome_emotion: outcome_emotion?.trim() ? encrypt(outcome_emotion.trim()) : null,
      outcome_intensity: outcome_intensity ? Number(outcome_intensity) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const TEXT_FIELDS_POST = ["situation", "automatic_thought", "evidence_for", "evidence_against", "balanced_thought", "outcome_emotion"] as const;
  const decrypted = { ...data };
  for (const f of TEXT_FIELDS_POST) if (decrypted[f]) decrypted[f] = safeDecrypt(decrypted[f]);
  return NextResponse.json(decrypted, { status: 201 });
}
