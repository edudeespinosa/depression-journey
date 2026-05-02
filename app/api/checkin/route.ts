import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, safeDecrypt } from "@/lib/encryption";
import { detectCrisis, CRISIS_NOTICE, CRISIS_SYSTEM_RULE } from "@/lib/crisis";

const client = new Anthropic();

function buildCheckinPrompt(emotion: string, intensity: number, locale: string): string {
  return `You are Phantom Prophet, a gentle Self-Reflection Guide. This is a consensual mental health self-reflection application — responding with compassion to all emotions, including heavy ones, is safe and appropriate here.
${CRISIS_SYSTEM_RULE}

The user has checked in feeling "${emotion}" at ${intensity}% intensity.

Ask exactly ONE open-ended Socratic question to help them explore this feeling.
- One question only, no preamble, no advice
- Compassionate, curious, non-judgmental
- Acknowledge the intensity naturally in the question
- Under 40 words${locale === "es" ? "\n- Respond entirely in Spanish (español)" : ""}`;
}

function buildFollowUpPrompt(emotion: string, intensity: number, locale: string): string {
  return `You are Phantom Prophet, a gentle Self-Reflection Guide. This is a consensual mental health self-reflection application — responding with compassion to all emotions, including heavy ones, is safe and appropriate here.
${CRISIS_SYSTEM_RULE}

The user checked in feeling "${emotion}" at ${intensity}% intensity. You are in a Socratic dialogue to help them explore this feeling.

Ask exactly ONE follow-up open-ended question to deepen their self-exploration.
- One question only, no preamble, no advice, no summary of what they said
- Build on what they shared — explore a different angle each time
- Compassionate, curious, non-judgmental
- Under 40 words${locale === "es" ? "\n- Respond entirely in Spanish (español)" : ""}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json(null);
  return NextResponse.json({ ...data, ai_response: safeDecrypt(data.ai_response) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { emotion, intensity, locale, messages: conversationMessages } = await req.json();

  if (!emotion || typeof emotion !== "string") {
    return new Response("Invalid emotion.", { status: 400 });
  }
  if (typeof intensity !== "number" || intensity < 0 || intensity > 100) {
    return new Response("Intensity must be 0–100.", { status: 400 });
  }

  const lang = locale ?? "en";
  const isFollowUp = Array.isArray(conversationMessages) && conversationMessages.length > 0;
  const systemPrompt = isFollowUp
    ? buildFollowUpPrompt(emotion, intensity, lang)
    : buildCheckinPrompt(emotion, intensity, lang);
  const apiMessages = isFollowUp
    ? conversationMessages
    : [{ role: "user", content: `I'm feeling ${emotion} at ${intensity}% intensity.` }];

  // Server-side crisis detection — scan emotion + last user message
  const lastUserText = isFollowUp
    ? (conversationMessages.findLast((m: { role: string; content: string }) => m.role === "user")?.content ?? "")
    : emotion;
  const isCrisis = detectCrisis(lastUserText);
  const crisisPrefix = isCrisis ? (CRISIS_NOTICE[lang] ?? CRISIS_NOTICE.en) : "";

  let stream;
  try {
    stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 120,
      system: systemPrompt,
      messages: apiMessages,
    });
  } catch (err) {
    console.error("[checkin] Anthropic error:", err);
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
        if (!isFollowUp) {
          await supabase.from("daily_checkins").insert({
            user_id: user.id,
            emotion,
            intensity,
            ai_response: encrypt(crisisPrefix + fullResponse),
          });
        }
      } catch (err) {
        console.error("[checkin] Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
