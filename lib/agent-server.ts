import Anthropic from "@anthropic-ai/sdk";

export type Suggestion = {
  type: "insight" | "nudge" | "celebration";
  message: string;
  action_label?: string;
  action_href?: string;
};

export const DEFAULT_SUGGESTION: Suggestion = {
  type: "nudge",
  message: "Start your day with a check-in — even a moment of reflection can shift your whole mood.",
  action_label: "Check in",
  action_href: "/checkin",
};

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

function buildSystem(todayISO: string): string {
  return `You are Phantom Prophet, a warm mental wellness companion.
You have tools to query a user's recent mood check-ins, journal moods, and habit data.
Today's date is ${todayISO}.

Your job: call the data tools, then call suggest exactly once with ONE meaningful observation.

Recency rules — check these FIRST before choosing a type:
- If days_since_last_checkin >= 2 (or no check-ins exist): ALWAYS use "nudge" to gently re-engage. Never celebrate old data as if it reflects the user's current state.
- If days_since_last_checkin >= 2, do NOT reference old moods as "this week's" wins.
- Use "celebration" only when the most recent check-in is from today or yesterday AND shows a genuinely positive trend.
- Use "insight" only when the data is recent (within 2 days) and reveals a meaningful pattern.

General rules:
- Be specific — reference actual patterns you see
- Keep message to 1-2 sentences, warm and non-clinical
- If no data exists yet, use "nudge" to welcome them and suggest a first check-in
- Never be alarmist or clinical`;
}

export async function runAgent(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<Suggestion> {
  const db = supabase;
  const todayISO = new Date().toISOString().split("T")[0];

  async function executeTool(name: string): Promise<string> {
    if (name === "get_recent_checkins") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { data } = await db
        .from("daily_checkins")
        .select("emotion, intensity, created_at")
        .eq("user_id", userId)
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) return "No check-ins in the last 7 days. days_since_last_checkin: 7+";
      const mostRecent = new Date(data[0].created_at);
      const today = new Date(todayISO);
      const daysSince = Math.floor((today.getTime() - mostRecent.setHours(0, 0, 0, 0)) / 86_400_000);
      return JSON.stringify({
        days_since_last_checkin: daysSince,
        checkins: data.map((c: { emotion: string; intensity: number; created_at: string }) => ({
          emotion: c.emotion,
          intensity: c.intensity,
          date: new Date(c.created_at).toISOString().split("T")[0],
        })),
      });
    }

    if (name === "get_journal_moods") {
      const { data } = await db
        .from("journal_entries")
        .select("mood, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!data || data.length === 0) return "No journal entries yet.";
      return JSON.stringify(
        data.map((e: { mood: string; created_at: string }) => ({
          mood: e.mood,
          date: new Date(e.created_at).toLocaleDateString(),
        }))
      );
    }

    if (name === "get_habit_status") {
      const today = new Date().toISOString().split("T")[0];
      const { data: habits } = await db
        .from("habits")
        .select("id, name, target_per_week")
        .eq("user_id", userId);
      if (!habits || habits.length === 0) return "No habits set up yet.";

      const habitIds = habits.map((h: { id: string }) => h.id);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: logs } = await db
        .from("habit_logs")
        .select("habit_id, completed_at")
        .in("habit_id", habitIds)
        .gte("completed_at", weekStart.toISOString().split("T")[0]);

      const todayLogs = new Set(
        logs?.filter((l: { completed_at: string; habit_id: string }) => l.completed_at === today)
          .map((l: { habit_id: string }) => l.habit_id) ?? []
      );
      const weekCounts = new Map<string, number>();
      for (const l of logs ?? []) {
        const log = l as { habit_id: string };
        weekCounts.set(log.habit_id, (weekCounts.get(log.habit_id) ?? 0) + 1);
      }

      return JSON.stringify(
        habits.map((h: { id: string; name: string; target_per_week: number }) => ({
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

  let suggestion: Suggestion | null = null;

  for (let i = 0; i < 6; i++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: buildSystem(todayISO),
        tools: TOOLS,
        messages,
      });
    } catch (err) {
      console.error("[agent] Anthropic error:", err);
      break;
    }

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "suggest") {
        suggestion = block.input as Suggestion;
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

  return suggestion ?? DEFAULT_SUGGESTION;
}
