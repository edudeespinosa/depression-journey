import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";
import { detectCrisis, CRISIS_NOTICE, CRISIS_SYSTEM_RULE } from "@/lib/crisis";

const client = new Anthropic();

function buildSystemPrompt(locale: string): string {
  const langInstruction = locale === "es"
    ? "\n- Respond entirely in Spanish (español)"
    : "";
  return `You are a gentle, warm mental health companion named Phantom Prophet. This is a consensual mental health self-reflection application — responding with compassion to all emotions, including heavy ones, is safe and appropriate here.
${CRISIS_SYSTEM_RULE}

Guidelines:
- Acknowledge what the user has shared before offering any reflection
- Ask one thoughtful open-ended question to help them explore deeper, at the end
- Keep your response under 200 words — brevity feels safer
- Never diagnose, prescribe, or replace professional therapy
- Use a calm, conversational tone — not clinical, not overly cheerful${langInstruction}`;
}

const VALID_MOODS = ["low", "okay", "good"] as const;
type Mood = typeof VALID_MOODS[number];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { entry, mood, locale } = await req.json();

  if (!entry || typeof entry !== "string" || entry.trim().length < 10) {
    return new Response("Entry too short.", { status: 400 });
  }

  const validMood: Mood | null = VALID_MOODS.includes(mood) ? mood : null;
  const lang = locale ?? "en";

  const isCrisis = detectCrisis(entry.trim());
  const crisisPrefix = isCrisis ? (CRISIS_NOTICE[lang] ?? CRISIS_NOTICE.en) : "";

  let stream;
  try {
    stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: buildSystemPrompt(lang),
      messages: [{ role: "user", content: entry.trim() }],
    });
  } catch (err) {
    console.error("[journal/reflect] Anthropic error:", err);
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
        await supabase.from("journal_entries").insert({
          user_id: user.id,
          content: encrypt(entry.trim()),
          ai_response: encrypt(crisisPrefix + fullResponse),
          mood: validMood,
        });
      } catch (err) {
        console.error("[journal/reflect] Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
