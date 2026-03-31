"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

type State = "idle" | "uploading" | "streaming" | "done" | "error";

export default function ArtNewPage() {
  const t = useTranslations("art");
  const locale = useLocale();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>("idle");
  const [streamedText, setStreamedText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || state !== "idle") return;

    setState("uploading");
    setStreamedText("");
    setErrorMsg("");

    try {
      // Upload image if provided
      let imageUrl: string | null = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/art/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error ?? "Upload failed");
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      // Create session + stream first AI response
      setState("streaming");
      const res = await fetch("/api/art/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, initialNote: note, locale }),
      });

      if (!res.ok) throw new Error(await res.text());

      // Grab session ID from header before reading body
      sessionIdRef.current = res.headers.get("X-Session-Id");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setStreamedText((prev) => prev + decoder.decode(value, { stream: true }));
      }

      setState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : t("errorMessage"));
      setState("error");
    }
  }

  function handleContinue() {
    if (sessionIdRef.current) {
      router.push(`/${locale}/art/${sessionIdRef.current}`);
    }
  }

  const canSubmit = note.trim().length >= 5 && state === "idle";

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div>
          <Link href={`/${locale}/art`} className="text-xs text-slate-400 hover:text-[#7C9082] transition">
            {t("backLink")}
          </Link>
          <h1 className="text-3xl font-light tracking-tight mt-2">{t("newTitle")}</h1>
          <p className="mt-1 text-slate-500 text-sm">{t("newSubtitle")}</p>
        </div>

        {state === "idle" || state === "uploading" ? (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Image upload */}
            <div>
              <p className="text-xs text-slate-400 mb-2">{t("uploadLabel")}</p>
              <div
                className="relative rounded-2xl border-2 border-dashed transition cursor-pointer"
                style={{ borderColor: preview ? "#7C9082" : "#E8E5DC" }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {preview ? (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                    <Image src={preview} alt="" fill className="object-contain" unoptimized />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-slate-500 hover:text-red-400 transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="py-10 flex flex-col items-center gap-2" style={{ color: "#9AA89E" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-sm">{t("uploadButton")}</span>
                    <span className="text-xs opacity-60">{t("uploadHint")}</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Note */}
            <div>
              <p className="text-xs text-slate-400 mb-2">{t("noteLabel")}</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                           text-[#2D3B35] placeholder:text-slate-300
                           focus:outline-none focus:ring-1 focus:ring-[#7C9082]
                           resize-none leading-relaxed transition"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#7C9082" }}
            >
              {state === "uploading" ? t("startingButton") : t("startButton")}
            </button>
          </form>
        ) : null}

        {/* Streaming / done */}
        {(state === "streaming" || state === "done") && (
          <div className="space-y-4">
            {/* User's note */}
            <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-500 leading-relaxed">
              {preview && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3">
                  <Image src={preview} alt="" fill className="object-contain" unoptimized />
                </div>
              )}
              <p className="whitespace-pre-wrap">{note}</p>
            </div>

            {/* AI response */}
            <div className="px-4 py-4 rounded-xl bg-white border border-[#d5e8dc] text-[#2D3B35] leading-relaxed whitespace-pre-wrap">
              {streamedText}
              {state === "streaming" && (
                <span className="inline-block w-1 h-4 ml-1 bg-[#7C9082] animate-pulse rounded-sm" />
              )}
            </div>

            {state === "done" && (
              <button
                onClick={handleContinue}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition"
                style={{ background: "#7C9082" }}
              >
                Continue the conversation →
              </button>
            )}
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-red-400 text-center">{errorMsg || t("errorMessage")}</p>
            <button
              onClick={() => setState("idle")}
              className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 text-sm hover:border-[#7C9082] hover:text-[#7C9082] transition"
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
