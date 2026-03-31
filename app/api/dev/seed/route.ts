import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";

// ─── Check-in seed data ───────────────────────────────────────────────────────
// Arc: heavier emotions early → lighter/more hopeful toward today
// [daysAgo, emotion, intensity, hour, ai_response]
const CHECKINS: [number, string, number, number, string][] = [
  [30, "Exhausted",   78, 8,  "What is it about this tiredness that feels different from just physical fatigue?"],
  [29, "Anxious",     65, 21, "When you notice this anxiety, where do you feel it most in your body?"],
  [28, "Sad",         72, 9,  "What would it mean to you to let yourself fully feel this sadness today?"],
  [27, "Overwhelmed", 82, 20, "If you could set down just one thing you're carrying right now, what would it be?"],
  [26, "Frustrated",  68, 15, "What expectation — yours or someone else's — sits at the heart of this frustration?"],
  [25, "Exhausted",   58, 8,  "What has been asking the most of you lately?"],
  [24, "Lonely",      74, 22, "What kind of connection are you craving most right now?"],
  [23, "Sad",         62, 10, "What would you want someone to truly understand about what you're going through?"],
  [22, "Anxious",     70, 19, "What story are you telling yourself about what might happen?"],
  [21, "Confused",    55, 14, "If your confusion could speak, what question would it most want answered?"],
  [20, "Overwhelmed", 65, 9,  "What would 'just enough' look like today, instead of trying to do everything?"],
  [19, "Exhausted",   52, 7,  "What does rest actually look like for you, and what is getting in the way of it?"],
  [18, "Cautious",    48, 18, "What are you most trying to protect yourself from right now?"],
  [17, "Sad",         58, 11, "What does this sadness want you to pay attention to?"],
  [16, "Frustrated",  72, 16, "What boundary keeps getting crossed, and what would honoring it look like?"],
  [15, "Hopeful",     42, 9,  "What small sign made hope feel possible today?"],
  [14, "Confused",    45, 13, "What do you know for certain, even in the middle of all this uncertainty?"],
  [13, "Anxious",     52, 20, "What is the difference between what you're worried about and what's actually true right now?"],
  [12, "Hopeful",     55, 8,  "What possibility are you most drawn to right now?"],
  [11, "Cautious",    40, 17, "What are you weighing as you decide how to move forward?"],
  [10, "Hopeful",     62, 9,  "What would you do differently if you fully trusted this feeling of hope?"],
  [9,  "Happy",       65, 10, "What made today feel different in a good way?"],
  [8,  "Exhausted",   44, 8,  "What would it feel like to give yourself permission to truly slow down?"],
  [7,  "Confident",   60, 11, "What helped you arrive at this confidence, and how can you carry it forward?"],
  [6,  "Happy",       70, 9,  "What is this happiness pointing you toward?"],
  [5,  "Hopeful",     67, 10, "What would you do if you knew this hope was trustworthy?"],
  [4,  "Anxious",     38, 19, "What is one thing entirely within your control right now?"],
  [3,  "Confident",   72, 9,  "What does this confidence make possible that didn't feel available before?"],
  [2,  "Happy",       75, 10, "What about today felt most alive to you?"],
  [1,  "Hopeful",     70, 8,  "What are you most looking forward to, and what would it mean if it came true?"],
  [0,  "Proud",       68, 9,  "What does this pride tell you about what matters most to you?"],
];

// ─── Habit seed data ──────────────────────────────────────────────────────────
const HABITS: [string, number, string, number[]][] = [
  [
    "Morning meditation",
    3,
    "gentle",
    [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25],
  ],
  [
    "Evening walk",
    5,
    "steady",
    [0, 1, 3, 4, 5, 7, 8, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26],
  ],
  [
    "Journaling",
    4,
    "steady",
    [0, 1, 3, 6, 7, 8, 10, 13, 14, 15, 17, 20, 21, 22, 24, 27],
  ],
  [
    "Gratitude practice",
    7,
    "focused",
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 26, 27, 28],
  ],
];

// ─── Journal seed data ────────────────────────────────────────────────────────
// [daysAgo, mood, content, ai_response]
const JOURNALS: [number, string, string, string][] = [
  [
    28,
    "low",
    "I woke up this morning with that familiar weight in my chest. It's hard to explain — nothing specific happened, but everything felt like too much before the day even started. I stayed in bed for an extra hour just staring at the ceiling, trying to find a reason to get up. Eventually I did, but it didn't feel like a win. It just felt like going through motions.",
    "There's something striking about the way you described that weight — familiar, but still hard to name. When you say 'going through motions,' I'm curious: was there any moment, even a tiny one, where you felt even slightly present rather than just moving through it?",
  ],
  [
    24,
    "low",
    "Had a hard conversation with my sister today. She asked how I was really doing and I didn't know what to say. I ended up saying 'fine' because the real answer felt too big. I don't even know how to start explaining it. I think I'm scared that if I say it out loud it becomes more real. Or that she won't understand. Or worse, that she'll worry and then I'll have to manage her feelings on top of my own.",
    "That pull between wanting to be honest and not wanting to become a burden — it sounds exhausting to carry both at once. What do you imagine would happen if she did understand exactly what you were going through?",
  ],
  [
    19,
    "okay",
    "Something small happened today that felt unexpectedly good. I made myself a proper breakfast instead of just coffee, and I sat at the table and actually ate it without looking at my phone. It sounds ridiculous that I'm writing about breakfast, but it felt like the first time in weeks that I did something just for myself without immediately rushing to the next thing. I want to remember this.",
    "It doesn't sound ridiculous at all — it sounds like you gave yourself something rare: your own undivided presence. What made this morning different from the others? Was it a decision, or did it just happen?",
  ],
  [
    15,
    "okay",
    "I've been thinking about why I stopped doing things I used to love. Drawing, reading actual books, cooking new recipes. I used to do all of these and now they feel like chores I keep adding to a list I never open. Part of me thinks I'm just lazy. But another part wonders if it's something else — like the part of me that used to find things interesting has gone quiet. I miss it.",
    "What you're describing — the quieting of curiosity and pleasure — is one of the most disorienting parts of what many people go through. That part of you isn't gone; it's more like it's gone underground. What's one thing you used to love that feels the least intimidating to try touching again, even lightly?",
  ],
  [
    10,
    "okay",
    "I went back to my old sketchbook today. Didn't draw anything new — just looked through it. There were drawings from a few years ago that I don't even remember making. Looking at them was strange: I felt proud of past-me, and also a little sad that she felt so far away. But I also felt something else. Something like wanting to pick up the pencil again. I didn't. But I wanted to.",
    "Wanting to is not nothing — in fact, it might be everything. That flicker of wanting is the same thing that made those drawings exist in the first place. What would it feel like to honor that impulse tomorrow, even for five minutes, without any expectation of what comes out?",
  ],
  [
    6,
    "good",
    "I drew something today. It wasn't good — just some shapes and lines that turned into a face I didn't plan. But I did it. I sat with it for about forty minutes and I forgot to check my phone. When I looked up, something in me felt quieter in a good way. Like some background noise had been turned down. I think I needed to remember that I can still make things.",
    "That quiet you found — the background noise turning down — that's what making things has always offered. And what you made doesn't have to be 'good' to be real or meaningful. What was it like to meet that face you didn't plan?",
  ],
  [
    2,
    "good",
    "It's been a strange few weeks. Hard in ways I couldn't have predicted, but also with moments of something I can only call light. I feel like I'm slowly remembering who I am outside of just surviving each day. I'm not all the way back — whatever that means — but I feel less lost than I did. I wanted to write that down so I don't forget.",
    "Writing it down was exactly the right instinct. These moments of clarity are easy to discount when a harder day arrives — having them in your own words gives you something real to return to. What does 'less lost' feel like in your body, right now as you write this?",
  ],
];

// ─── Thought record seed data ─────────────────────────────────────────────────
const THOUGHT_RECORDS = [
  {
    daysAgo: 26,
    situation: "Missed a deadline at work. My manager sent a follow-up message asking for an update.",
    automatic_thought: "I'm falling apart. Everyone can see I can't handle this.",
    emotion: "ashamed",
    intensity: 8,
    evidence_for: "The deadline was missed. My manager noticed. I've been struggling to focus for weeks.",
    evidence_against: "I've delivered on time many times before. My manager's message was neutral, not accusatory. Missing one deadline doesn't define my whole performance.",
    balanced_thought: "I missed this deadline, which is a real setback. But I have a solid track record, and one difficult stretch doesn't undo that. I can communicate honestly with my manager and make a plan to catch up.",
    outcome_emotion: "calmer",
    outcome_intensity: 4,
  },
  {
    daysAgo: 18,
    situation: "Lying in bed at night, unable to stop replaying a conversation from earlier where I felt I said the wrong thing.",
    automatic_thought: "I always say the wrong thing. People must find me exhausting.",
    emotion: "anxious",
    intensity: 7,
    evidence_for: "The conversation felt awkward. The other person seemed quiet afterward.",
    evidence_against: "I was nervous, not careless. The other person was probably just tired — they had a long day. I've had many good conversations with them. One awkward moment isn't a pattern.",
    balanced_thought: "That conversation was uncomfortable for me, but I don't actually know how the other person experienced it. Even if it was awkward, one moment doesn't mean I'm fundamentally difficult to be around.",
    outcome_emotion: "relieved",
    outcome_intensity: 3,
  },
  {
    daysAgo: 8,
    situation: "Started to feel hopeful about a project but immediately thought 'this won't last.'",
    automatic_thought: "Every time I feel good it's just temporary. Something will go wrong.",
    emotion: "sad",
    intensity: 6,
    evidence_for: "There have been times when I felt better and then things got hard again.",
    evidence_against: "Hard periods ending doesn't mean the good moments weren't real. Feeling hopeful right now is real, regardless of what comes next. I'm not predicting the future — I'm avoiding the present.",
    balanced_thought: "Good moments being temporary doesn't make them false. This feeling of hope is real and it's here right now. I can let myself have it without bracing for it to be taken away.",
    outcome_emotion: "present",
    outcome_intensity: 3,
  },
];

// ─── Art session seed data ────────────────────────────────────────────────────
// [daysAgo, initial_note, messages: [role, content][]]
const ART_SESSIONS: [number, string, [string, string][]][] = [
  [
    14,
    "I painted this last week. I wasn't trying to make anything in particular — I just kept adding layers until it felt done. Looking at it now I think it's about being buried under things that don't feel like mine.",
    [
      ["assistant", "There's something powerful in the way you describe this — adding layers until it felt done, without a predetermined destination. I'm curious about those layers. Are they all the same weight to you, or do some feel heavier than others?"],
      ["user", "Some feel heavier. The ones at the bottom. Like they've been there the longest."],
      ["assistant", "The oldest layers, carrying the most weight. That makes a kind of sense — things we've held longest have had time to settle deep. If you could name what's at the very bottom, not what it looks like, but what it feels like, what would you say?"],
      ["user", "Exhaustion. Not the tired-from-one-bad-day kind. The kind that's been there so long I've forgotten what it felt like before it."],
      ["assistant", "That kind of exhaustion — the kind that's become background noise rather than a specific event — is one of the heaviest things a person can carry. And yet here you are, making something out of it, which is its own form of acknowledgment. What made you pick up the brush that day?"],
    ],
  ],
  [
    5,
    "I drew this during my lunch break. Just pencil lines — no plan. It turned into something that looks like a doorway to me, though I didn't intend it. I've been thinking a lot about what's next.",
    [
      ["assistant", "A doorway that arrived without being planned — that's a beautiful thing for an image to do. Doorways are thresholds: something ends, something begins. When you look at it, does the door feel open or closed to you?"],
      ["user", "Half open, I think. Like I'm standing at it but haven't decided whether to go through."],
      ["assistant", "That position — at the threshold, not yet committed — what does it feel like to stand there? Is it more like hesitation, or more like savoring the last moment before things change?"],
      ["user", "A bit of both. I'm scared of what's on the other side. But also tired of the room I'm already in."],
      ["assistant", "That's a real and honest place to be. The room you're in is familiar even if it's uncomfortable, and familiarity has its own pull — even when we've outgrown it. What would you need to feel ready to step through?"],
    ],
  ],
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();

  // ── Insert check-ins ──────────────────────────────────────────────────────
  const checkinRows = CHECKINS.map(([daysAgo, emotion, intensity, hour, ai_response]) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, Math.floor(Math.random() * 30), 0, 0);
    return { user_id: user.id, emotion, intensity, ai_response, created_at: date.toISOString() };
  });

  const { error: checkinError } = await supabase.from("daily_checkins").insert(checkinRows);
  if (checkinError) {
    return NextResponse.json({ error: checkinError.message }, { status: 500 });
  }

  // ── Insert habits ─────────────────────────────────────────────────────────
  const habitMeta = HABITS.map(([name, target_per_week, commitment_level]) => ({
    user_id: user.id,
    name,
    target_per_week,
    commitment_level,
  }));

  const { data: insertedHabits, error: habitError } = await supabase
    .from("habits")
    .insert(habitMeta)
    .select("id, name");

  if (habitError || !insertedHabits) {
    return NextResponse.json({ error: habitError?.message ?? "Habit insert failed" }, { status: 500 });
  }

  // ── Insert habit logs ─────────────────────────────────────────────────────
  const logRows: { habit_id: string; user_id: string; completed_at: string }[] = [];

  for (const inserted of insertedHabits) {
    const seedEntry = HABITS.find(([name]) => name === inserted.name);
    if (!seedEntry) continue;
    const completedDaysAgo = seedEntry[3] as number[];

    for (const daysAgo of completedDaysAgo) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      logRows.push({
        habit_id: inserted.id,
        user_id: user.id,
        completed_at: date.toISOString().split("T")[0],
      });
    }
  }

  const { error: logsError } = await supabase.from("habit_logs").insert(logRows);
  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  // ── Insert journal entries ────────────────────────────────────────────────
  const journalRows = JOURNALS.map(([daysAgo, mood, content, ai_response]) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(21, Math.floor(Math.random() * 30), 0, 0);
    return {
      user_id: user.id,
      mood,
      content: encrypt(content),
      ai_response: encrypt(ai_response),
      created_at: date.toISOString(),
    };
  });

  const { error: journalError } = await supabase.from("journal_entries").insert(journalRows);
  if (journalError) {
    return NextResponse.json({ error: `Journal: ${journalError.message}` }, { status: 500 });
  }

  // ── Insert thought records ────────────────────────────────────────────────
  const thoughtRows = THOUGHT_RECORDS.map((t) => {
    const date = new Date(now);
    date.setDate(date.getDate() - t.daysAgo);
    date.setHours(20, 0, 0, 0);
    return {
      user_id: user.id,
      situation: encrypt(t.situation),
      automatic_thought: encrypt(t.automatic_thought),
      emotion: t.emotion,
      intensity: t.intensity,
      evidence_for: encrypt(t.evidence_for),
      evidence_against: encrypt(t.evidence_against),
      balanced_thought: encrypt(t.balanced_thought),
      outcome_emotion: encrypt(t.outcome_emotion),
      outcome_intensity: t.outcome_intensity,
      created_at: date.toISOString(),
    };
  });

  const { error: thoughtError } = await supabase.from("thought_records").insert(thoughtRows);
  if (thoughtError) {
    return NextResponse.json({ error: `Thoughts: ${thoughtError.message}` }, { status: 500 });
  }

  // ── Insert art sessions + messages ────────────────────────────────────────
  for (const [daysAgo, initial_note, messages] of ART_SESSIONS) {
    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - daysAgo);
    sessionDate.setHours(15, 0, 0, 0);

    const { data: session, error: sessionError } = await supabase
      .from("art_sessions")
      .insert({
        user_id: user.id,
        image_url: null,
        initial_note: encrypt(initial_note),
        created_at: sessionDate.toISOString(),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: `Art session: ${sessionError?.message}` }, { status: 500 });
    }

    const messageRows = messages.map(([role, content], i) => {
      const msgDate = new Date(sessionDate);
      msgDate.setMinutes(i * 3);
      return {
        session_id: session.id,
        role,
        content: encrypt(content),
        created_at: msgDate.toISOString(),
      };
    });

    const { error: msgError } = await supabase.from("art_messages").insert(messageRows);
    if (msgError) {
      return NextResponse.json({ error: `Art messages: ${msgError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    checkins: checkinRows.length,
    habits: insertedHabits.length,
    logs: logRows.length,
    journals: journalRows.length,
    thoughts: thoughtRows.length,
    artSessions: ART_SESSIONS.length,
  });
}

// ─── Clear seed data ──────────────────────────────────────────────────────────
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await supabase.from("daily_checkins").delete().eq("user_id", user.id);
  await supabase.from("habit_logs").delete().eq("user_id", user.id);
  await supabase.from("habits").delete().eq("user_id", user.id);
  await supabase.from("journal_entries").delete().eq("user_id", user.id);
  await supabase.from("thought_records").delete().eq("user_id", user.id);
  await supabase.from("art_messages").delete().in(
    "session_id",
    (await supabase.from("art_sessions").select("id").eq("user_id", user.id)).data?.map((s) => s.id) ?? []
  );
  await supabase.from("art_sessions").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true, cleared: true });
}
