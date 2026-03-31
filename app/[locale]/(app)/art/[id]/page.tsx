"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Session = {
  id: string;
  image_url: string | null;
  initial_note: string;
  created_at: string;
  messages: Message[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function ArtSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("art");
  const locale = useLocale();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setSessionId(id);
      fetch(`/api/art/sessions/${id}`)
        .then((r) => r.json())
        .then((d) => {
          setSession(d);
          setMessages(d.messages ?? []);
        })
        .finally(() => setLoading(false));
    });
  }, [params]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || streaming || !sessionId) return;

    const text = reply.trim();
    setReply("");
    setError("");
    setStreaming(true);
    setStreamingText("");

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: text, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await fetch(`/api/art/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale }),
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(fullText);
      }

      // Replace streaming bubble with real message
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "assistant", content: fullText, created_at: new Date().toISOString() },
      ]);
      setStreamingText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorMessage"));
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setStreaming(false);
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center flex-1">
        <div className="w-5 h-5 border-2 border-[#7C9082] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex flex-col items-center px-4 py-12 flex-1">
        <p className="text-slate-400 text-sm">Session not found.</p>
        <Link href={`/${locale}/art`} className="mt-4 text-sm text-[#7C9082] hover:underline">
          {t("backLink")}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 max-h-screen lg:max-h-screen">

      {/* Sticky header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#E8E5DC" }}>
        <Link href={`/${locale}/art`} className="text-xs text-slate-400 hover:text-[#7C9082] transition">
          {t("backLink")}
        </Link>
        <p className="text-xs text-slate-400">{formatDate(session.created_at)}</p>
      </div>

      {/* Scrollable conversation area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="w-full max-w-2xl mx-auto space-y-4">

          {/* Artwork + initial note */}
          {session.image_url && (
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm">
              <div className="relative w-full" style={{ maxHeight: "320px" }}>
                <Image
                  src={session.image_url}
                  alt={t("imageSectionLabel")}
                  width={800}
                  height={600}
                  className="w-full object-contain"
                  style={{ maxHeight: "320px" }}
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Initial note (user) */}
          <div className="flex justify-end">
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
              style={{ background: "#E2E8E3", color: "#3E4A3D" }}
            >
              {session.initial_note}
            </div>
          </div>

          {/* Conversation messages */}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  m.role === "user"
                    ? { background: "#E2E8E3", color: "#3E4A3D", borderTopRightRadius: "4px" }
                    : { background: "#fff", color: "#2D3B35", border: "1px solid #d5e8dc", borderTopLeftRadius: "4px" }
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Streaming bubble */}
          {streaming && streamingText && (
            <div className="flex justify-start">
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: "#fff", color: "#2D3B35", border: "1px solid #d5e8dc", borderTopLeftRadius: "4px" }}
              >
                {streamingText}
                <span className="inline-block w-1 h-4 ml-1 bg-[#7C9082] animate-pulse rounded-sm" />
              </div>
            </div>
          )}

          {/* Typing indicator (before text arrives) */}
          {streaming && !streamingText && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white border border-[#d5e8dc] flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#7C9082] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "#E8E5DC", background: "#FDFCF8" }}>
        <form onSubmit={handleSend} className="w-full max-w-2xl mx-auto flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            placeholder={t("replyPlaceholder")}
            rows={2}
            disabled={streaming}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white
                       text-[#2D3B35] placeholder:text-slate-300 text-sm
                       focus:outline-none focus:ring-1 focus:ring-[#7C9082]
                       resize-none leading-relaxed disabled:opacity-50 transition"
          />
          <button
            type="submit"
            disabled={!reply.trim() || streaming}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition self-end"
            style={{ background: "#7C9082" }}
          >
            {t("sendButton")}
          </button>
        </form>
      </div>
    </main>
  );
}
