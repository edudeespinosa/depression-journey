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

Continue the conversation with warmth and curiosity:
- Build on what has already been shared — don't start over
- Ask one follow-up question if it feels natural, but it's okay to just reflect
- Keep responses under 180 words
- Never diagnose or replace professional therapy${langInstruction}`;
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Verify session ownership
  const { data: session } = await supabase
    .from("art_sessions")
    .select("id, image_url, initial_note")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!session) return new Response("Not found", { status: 404 });

  const { message, locale } = await req.json();
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return new Response("Message required.", { status: 400 });
  }

  const lang = locale ?? "en";
  const isCrisis = detectCrisis(message.trim());
  const crisisPrefix = isCrisis ? (CRISIS_NOTICE[lang] ?? CRISIS_NOTICE.en) : "";

  // Fetch existing messages
  const { data: existingMessages } = await supabase
    .from("art_messages")
    .select("role, content")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  // Reconstruct conversation for Claude
  // First turn: image (if any) + initial note
  const firstUserContent: Anthropic.MessageParam["content"] = [];
  if (session.image_url) {
    firstUserContent.push({ type: "image", source: { type: "url", url: session.image_url } });
  }
  firstUserContent.push({ type: "text", text: safeDecrypt(session.initial_note) ?? "" });

  const claudeMessages: Anthropic.MessageParam[] = [
    { role: "user", content: firstUserContent },
  ];

  // Interleave existing messages (assistant first, then user/assistant pairs)
  for (const m of existingMessages ?? []) {
    claudeMessages.push({
      role: m.role as "user" | "assistant",
      content: safeDecrypt(m.content) ?? "",
    });
  }

  // Add the new user message
  claudeMessages.push({ role: "user", content: message.trim() });

  // Save user message immediately
  await supabase.from("art_messages").insert({
    session_id: id,
    role: "user",
    content: encrypt(message.trim()),
  });

  let stream;
  try {
    stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: buildSystemPrompt(lang),
      messages: claudeMessages,
    });
  } catch (err) {
    console.error("[art/chat] Anthropic error:", err);
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
          session_id: id,
          role: "assistant",
          content: encrypt(crisisPrefix + fullResponse),
        });
      } catch (err) {
        console.error("[art/chat] Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
