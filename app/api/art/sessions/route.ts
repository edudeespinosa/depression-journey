import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, safeDecrypt } from "@/lib/encryption";
import { detectCrisis, CRISIS_NOTICE, CRISIS_SYSTEM_RULE } from "@/lib/crisis";

const client = new Anthropic();

function buildSystemPrompt(locale: string): string {
  const langInstruction = locale === "es"
    ? "\n- Respond entirely in Spanish (español)"
    : "";
  return `You are Phantom Prophet, a compassionate companion helping someone explore the emotions and meanings in their artwork. This is a consensual mental health self-reflection application — responding with compassion to all emotions, including heavy ones, is safe and appropriate here.
${CRISIS_SYSTEM_RULE}

When presented with artwork and a personal reflection:
- Gently notice what you observe — colors, shapes, energy, mood — without over-interpreting
- Acknowledge what the person has shared with warmth and curiosity
- Ask exactly one open, inviting question to deepen their exploration
- Keep your response under 180 words — brevity feels safe and gentle
- Never diagnose, label their emotions for them, or replace professional therapy
- Speak in a calm, unhurried, curious tone${langInstruction}`;
}

// GET — list the current user's art sessions
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: sessions, error } = await supabase
    .from("art_sessions")
    .select("id, image_url, initial_note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Attach first AI message snippet for preview
  const enriched = await Promise.all((sessions ?? []).map(async (s) => {
    const { data: firstMsg } = await supabase
      .from("art_messages")
      .select("content")
      .eq("session_id", s.id)
      .eq("role", "assistant")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    return {
      ...s,
      initial_note: safeDecrypt(s.initial_note),
      ai_snippet: firstMsg ? safeDecrypt(firstMsg.content)?.slice(0, 120) : null,
    };
  }));

  return Response.json(enriched);
}

// POST — create a session and stream the first AI response
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { imageUrl, initialNote, locale } = await req.json();

  if (!initialNote || typeof initialNote !== "string" || initialNote.trim().length < 5) {
    return new Response("Note too short.", { status: 400 });
  }

  // Create session record first
  const { data: session, error: sessionError } = await supabase
    .from("art_sessions")
    .insert({
      user_id: user.id,
      image_url: imageUrl ?? null,
      initial_note: encrypt(initialNote.trim()),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return new Response(sessionError?.message ?? "Failed to create session", { status: 500 });
  }

  const lang = locale ?? "en";
  const isCrisis = detectCrisis(initialNote.trim());
  const crisisPrefix = isCrisis ? (CRISIS_NOTICE[lang] ?? CRISIS_NOTICE.en) : "";

  // Build first user message for Claude (with optional image)
  const userContent: Anthropic.MessageParam["content"] = [];

  if (imageUrl) {
    userContent.push({ type: "image", source: { type: "url", url: imageUrl } });
  }
  userContent.push({ type: "text", text: initialNote.trim() });

  let stream;
  try {
    stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: buildSystemPrompt(lang),
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err) {
    console.error("[art/sessions] Anthropic error:", err);
    return new Response("AI service temporarily unavailable.", { status: 502 });
  }

  const enc = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      if (crisisPrefix) controller.enqueue(enc.encode(crisisPrefix));
      let fullResponse = "";
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            fullResponse += chunk.delta.text;
            controller.enqueue(enc.encode(chunk.delta.text));
          }
        }
        await supabase.from("art_messages").insert({
          session_id: session.id,
          role: "assistant",
          content: encrypt(crisisPrefix + fullResponse),
        });
      } catch (err) {
        console.error("[art/sessions] Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Session-Id": session.id,
    },
  });
}
