import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic();

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_recent_checkins",
    description: "Get the user's mood check-ins from the last 7 days",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_journal_moods",
    description: "Get the mood tags from the user's last 5 journal entries",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_habit_status",
    description: "Get today's habit completion status and weekly progress",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "suggest",
    description: "Emit the final contextual suggestion to display on the dashboard",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["insight", "nudge", "celebration"],
          description: "insight=pattern noticed, nudge=gentle action prompt, celebration=positive milestone",
        },
        message: {
          type: "string",
          description: "1-2 sentences, warm and personal",
        },
        action_label: {
          type: "string",
          description: "Optional button label (e.g. 'Check in now')",
        },
        action_href: {
          type: "string",
          description: "Optional path (e.g. /checkin, /journal, /habits)",
        },
      },
      required: ["type", "message"],
    },
  },
];

const SYSTEM = `You are Phantom Prophet, a warm mental wellness companion.
You have tools to query a user's recent mood check-ins, journal moods, and habit data.

Your job: call the data tools, then call suggest exactly once with ONE meaningful observation.

- Be specific — reference actual patterns you see
- Keep message to 1-2 sentences, warm and non-clinical
- type "insight": you noticed a meaningful pattern
- type "nudge": something beneficial has been missed (no check-ins, habits behind)
- type "celebration": streak, goal met, or mood improving
- If no data exists yet, use "nudge" to welcome them and suggest a first check-in
- Never be alarmist or clinical`;

type SuggestionInput = {
  type: "insight" | "nudge" | "celebration";
  message: string;
  action_label?: string;
  action_href?: string;
};

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;

  async function executeTool(name: string): Promise<string> {
    if (name === "get_recent_checkins") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { data } = await supabase
        .from("daily_checkins")
        .select("emotion, intensity, created_at")
        .eq("user_id", userId)
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) return "No check-ins in the last 7 days.";
      return JSON.stringify(
        data.map((c) => ({
          emotion: c.emotion,
          intensity: c.intensity,
          date: new Date(c.created_at).toLocaleDateString(),
        }))
      );
    }

    if (name === "get_journal_moods") {
      const { data } = await supabase
        .from("journal_entries")
        .select("mood, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!data || data.length === 0) return "No journal entries yet.";
      return JSON.stringify(
        data.map((e) => ({
          mood: e.mood,
          date: new Date(e.created_at).toLocaleDateString(),
        }))
      );
    }

    if (name === "get_habit_status") {
      const today = new Date().toISOString().split("T")[0];
      const { data: habits } = await supabase
        .from("habits")
        .select("id, name, target_per_week")
        .eq("user_id", userId);
      if (!habits || habits.length === 0) return "No habits set up yet.";

      const habitIds = habits.map((h) => h.id);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from("habit_logs")
        .select("habit_id, completed_at")
        .in("habit_id", habitIds)
        .gte("completed_at", weekStart.toISOString().split("T")[0]);

      const todayLogs = new Set(
        logs?.filter((l) => l.completed_at === today).map((l) => l.habit_id) ?? []
      );
      const weekCounts = new Map<string, number>();
      for (const l of logs ?? []) {
        weekCounts.set(l.habit_id, (weekCounts.get(l.habit_id) ?? 0) + 1);
      }

      return JSON.stringify(
        habits.map((h) => ({
          name: h.name,
          completedToday: todayLogs.has(h.id),
          weekCount: weekCounts.get(h.id) ?? 0,
          target: h.target_per_week,
        }))
      );
    }

    return "Unknown tool.";
  }

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "Review my recent wellness data and share one personalized insight or suggestion.",
    },
  ];

  let suggestion: SuggestionInput | null = null;

  for (let i = 0; i < 6; i++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: SYSTEM,
        tools: TOOLS,
        messages,
      });
    } catch (err) {
      console.error("[agent] Anthropic error:", err);
      break;
    }

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "suggest") {
        suggestion = block.input as SuggestionInput;
        break;
      }
    }

    if (suggestion || response.stop_reason === "end_turn" || response.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use" && block.name !== "suggest") {
        const result = await executeTool(block.name);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }

    if (toolResults.length === 0) break;
    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json(
    suggestion ?? {
      type: "nudge",
      message: "Start your day with a check-in — even a moment of reflection can shift your whole mood.",
      action_label: "Check in",
      action_href: "/checkin",
    }
  );
}
