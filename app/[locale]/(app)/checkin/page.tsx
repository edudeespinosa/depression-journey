"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

type EmotionCategory = "positive" | "low" | "angry" | "anxious" | "complex";
type CheckinState = "idle" | "loading" | "streaming" | "done" | "finished" | "error";
type Message = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 3;

const EMOTIONS: { id: string; emoji: string; category: EmotionCategory }[] = [
  // Positive
  { id: "happy",       emoji: "😊", category: "positive" },
  { id: "ecstatic",    emoji: "🤩", category: "positive" },
  { id: "confident",   emoji: "😎", category: "positive" },
  { id: "hopeful",     emoji: "🌱", category: "positive" },
  { id: "in_love",     emoji: "🥰", category: "positive" },
  { id: "proud",       emoji: "😏", category: "positive" },
  // Low
  { id: "sad",         emoji: "😢", category: "low" },
  { id: "depressed",   emoji: "😞", category: "low" },
  { id: "lonely",      emoji: "🫥", category: "low" },
  { id: "bored",       emoji: "😑", category: "low" },
  { id: "exhausted",   emoji: "😴", category: "low" },
  { id: "grieved",     emoji: "😔", category: "low" },
  // Angry
  { id: "angry",       emoji: "😠", category: "angry" },
  { id: "frustrated",  emoji: "😤", category: "angry" },
  { id: "enraged",     emoji: "🤬", category: "angry" },
  { id: "resentful",   emoji: "😒", category: "angry" },
  // Anxious
  { id: "anxious",     emoji: "😰", category: "anxious" },
  { id: "scared",      emoji: "😨", category: "anxious" },
  { id: "terrified",   emoji: "😱", category: "anxious" },
  { id: "cautious",    emoji: "🤔", category: "anxious" },
  // Complex
  { id: "confused",    emoji: "😕", category: "complex" },
  { id: "ashamed",     emoji: "😳", category: "complex" },
  { id: "guilty",      emoji: "😬", category: "complex" },
  { id: "jealous",     emoji: "👀", category: "complex" },
  { id: "disgusted",   emoji: "🤢", category: "complex" },
  { id: "suspicious",  emoji: "🧐", category: "complex" },
  { id: "overwhelmed", emoji: "🫠", category: "complex" },
  { id: "frantic",     emoji: "😵", category: "complex" },
  { id: "timid",       emoji: "😶", category: "complex" },
  { id: "surprised",   emoji: "😲", category: "complex" },
];

const CATEGORY_STYLES: Record<EmotionCategory, { unselected: string }> = {
  positive: { unselected: "bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400" },
  low:      { unselected: "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400" },
  angry:    { unselected: "bg-red-50 border-red-200 text-red-600 hover:border-red-400" },
  anxious:  { unselected: "bg-teal-50 border-teal-200 text-teal-700 hover:border-teal-400" },
  complex:  { unselected: "bg-purple-50 border-purple-200 text-purple-700 hover:border-purple-400" },
};

const SELECTED_STYLE = "bg-[#7C9082] border-[#7C9082] text-white";

export default function CheckinPage() {
  const t = useTranslations("checkin");
  const locale = useLocale();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [state, setState] = useState<CheckinState>("idle");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const turnsRef = useRef(0);

  const selectedEmotion = EMOTIONS.find((e) => e.id === selectedId);
  const canSubmit = !!selectedId && state === "idle";

  const showPicker = state === "idle" || (state === "loading" && history.length === 0);
  const showConversation = state === "streaming" || history.length > 0;

  async function streamCheckin(apiMessages?: Message[]) {
    if (!selectedEmotion) return;

    abortRef.current = new AbortController();
    setState("loading");
    setResponse("");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emotion: t(`emotions.${selectedEmotion.id}`),
          intensity,
          locale,
          ...(apiMessages ? { messages: apiMessages } : {}),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      setState("streaming");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setResponse((prev) => prev + chunk);
      }

      setHistory((prev) => [...prev, { role: "assistant", content: fullResponse }]);
      setResponse("");
      turnsRef.current += 1;
      setState(turnsRef.current >= MAX_TURNS ? "finished" : "done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState("error");
    }
  }

  function handleSendReply() {
    const reply = userInput.trim();
    if (!reply) return;

    const userMsg: Message = { role: "user", content: reply };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setUserInput("");

    const apiMessages: Message[] = [
      { role: "user", content: `I'm feeling ${t(`emotions.${selectedEmotion!.id}`)} at ${intensity}% intensity.` },
      ...newHistory,
    ];
    streamCheckin(apiMessages);
  }

  function handleNew() {
    abortRef.current?.abort();
    setSelectedId(null);
    setIntensity(50);
    setResponse("");
    setState("idle");
    setHistory([]);
    setUserInput("");
    turnsRef.current = 0;
  }

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-slate-500 text-sm">{t("subtitle")}</p>
          </div>
          <Link
            href={`/${locale}/checkin/history`}
            className="text-xs text-slate-400 hover:text-[#7C9082] transition pt-1"
          >
            {t("historyLink")}
          </Link>
        </div>

        {/* Emotion picker */}
        {showPicker && (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-2">
              {EMOTIONS.map(({ id, emoji, category }) => {
                const isSelected = selectedId === id;
                const style = isSelected ? SELECTED_STYLE : CATEGORY_STYLES[category].unselected;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedId(isSelected ? null : id)}
                    disabled={state === "loading"}
                    className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-center transition disabled:opacity-50 ${style}`}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <span className="text-[9px] font-medium leading-tight">
                      {t(`emotions.${id}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedId && (
              <div className="space-y-2 bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{t("intensityLabel")}</p>
                  <span className="text-sm font-light text-[#7C9082]">{intensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  disabled={state === "loading"}
                  className="w-full accent-[#7C9082] disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span>{t("intensityLow")}</span>
                  <span>{t("intensityHigh")}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => streamCheckin()}
              disabled={!canSubmit}
              className="w-full bg-[#7C9082] text-white py-3 rounded-xl text-sm
                         hover:bg-[#6A7C70] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {state === "loading" ? t("listeningButton") : t("reflectButton")}
            </button>
          </div>
        )}

        {/* Conversation thread */}
        {showConversation && (
          <div className="space-y-3">
            {/* Emotion recap */}
            {selectedEmotion && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="text-2xl">{selectedEmotion.emoji}</span>
                <span>{t(`emotions.${selectedEmotion.id}`)} · {intensity}%</span>
              </div>
            )}

            {/* History messages */}
            {history.map((msg, i) =>
              msg.role === "assistant" ? (
                <div
                  key={i}
                  className="px-5 py-4 rounded-xl bg-white border border-[#c8d5c9] text-[#3E4A3D] leading-relaxed text-sm"
                >
                  {msg.content}
                </div>
              ) : (
                <div
                  key={i}
                  className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-sm ml-8"
                >
                  {msg.content}
                </div>
              )
            )}

            {/* Streaming response */}
            {state === "streaming" && (
              <div className="px-5 py-4 rounded-xl bg-white border border-[#c8d5c9] text-[#3E4A3D] leading-relaxed text-sm">
                {response}
                <span className="inline-block w-1 h-4 ml-1 bg-[#7C9082] animate-pulse rounded-sm" />
              </div>
            )}

            {/* Loading placeholder for follow-up turns */}
            {state === "loading" && history.length > 0 && (
              <div className="px-5 py-4 rounded-xl bg-white border border-[#c8d5c9] text-slate-300 text-sm">
                {t("listeningButton")}
              </div>
            )}

            {/* Reply input */}
            {state === "done" && (
              <div className="space-y-2 pt-1">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && userInput.trim()) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder={t("replyPlaceholder")}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#3E4A3D]
                             placeholder-slate-300 resize-none focus:outline-none focus:border-[#7C9082] transition bg-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSendReply}
                    disabled={!userInput.trim()}
                    className="flex-1 bg-[#7C9082] text-white py-2 rounded-xl text-sm
                               hover:bg-[#6A7C70] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {t("sendButton")}
                  </button>
                  <button
                    onClick={() => setState("finished")}
                    className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm
                               hover:border-[#7C9082] hover:text-[#7C9082] transition"
                  >
                    {t("finishButton")}
                  </button>
                </div>
              </div>
            )}

            {/* Finished */}
            {state === "finished" && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-center text-slate-400">{t("savedMessage")}</p>
                <button
                  onClick={handleNew}
                  className="w-full py-2 rounded-xl border border-slate-200 text-slate-500
                             hover:border-[#7C9082] hover:text-[#7C9082] text-sm transition"
                >
                  {t("newCheckin")}
                </button>
              </div>
            )}
          </div>
        )}

        {state === "error" && (
          <p className="text-sm text-red-400 text-center">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </main>
  );
}
