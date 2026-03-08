import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic();

const CATEGORY_LABELS: Record<string, string> = {
  creativity: "creativity and self-expression",
  family: "family and close relationships",
  career: "work and professional growth",
  humor: "lightness, humor, and joy",
  freedom: "independence and personal freedom",
  spiritual: "spirituality and inner meaning",
  other: "personal growth",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { value_category, context, locale } = await req.json();
  const area = CATEGORY_LABELS[value_category] ?? "personal growth";
  const langNote = locale === "es" ? "\n- Write entirely in Spanish." : "";

  const systemPrompt = `You are an evidence-based affirmation coach drawing on self-affirmation theory (Cascio et al., 2016).

Write ONE self-affirmation following these research-backed principles:
- Future-focused framing: "I am becoming...", "I am learning...", "Each day I...", "I am growing..."
- Tied to the user's chosen value area: ${area}
- Specific and believable — not grandiose ("I am perfect") but aspirational and grounded
- 20–30 words maximum
- No quotation marks, no preamble, no explanation — just the affirmation itself${langNote}`;

  const userMessage = context?.trim()
    ? `Value area: ${area}\nContext: ${context.trim()}`
    : `Value area: ${area}`;

  let stream;
  try {
    stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 80,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    return new Response(String(err), { status: 502 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
