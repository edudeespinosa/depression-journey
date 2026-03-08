"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";

type Frequency = "daily" | "weekdays" | "weekends";
type Category = "creativity" | "family" | "career" | "humor" | "freedom" | "spiritual" | "other";

type Affirmation = {
  id: string;
  text: string;
  value_category: Category;
  frequency: Frequency;
  is_active: boolean;
  created_at: string;
};

const CATEGORIES: Category[] = ["creativity", "family", "career", "humor", "freedom", "spiritual", "other"];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Convert local HH:MM to UTC HH:MM for server storage */
function toUtcTime(localTime: string): string {
  const [h, m] = localTime.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Convert UTC HH:MM back to local HH:MM for display */
function toLocalTime(utcTime: string): string {
  const [h, m] = utcTime.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AffirmationsPage() {
  const t = useTranslations("affirmations");
  const locale = useLocale();

  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [loading, setLoading] = useState(true);

  // AI coach state
  const [selectedCategory, setSelectedCategory] = useState<Category>("other");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  // Add form state
  const [addingManual, setAddingManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualCategory, setManualCategory] = useState<Category>("other");
  const [manualFrequency, setManualFrequency] = useState<Frequency>("daily");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Push notifications
  const [notifTime, setNotifTime] = useState("08:00");
  const [savedNotifTime, setSavedNotifTime] = useState("08:00");
  const [editingTime, setEditingTime] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "pending" | "on" | "denied">("idle");
  const [notifError, setNotifError] = useState<string | null>(null);
  const [updatingTime, setUpdatingTime] = useState(false);
  const subRef = useRef<PushSubscription | null>(null);

  useEffect(() => {
    fetch("/api/affirmations")
      .then((r) => r.json())
      .then((data) => setAffirmations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));

    // Check existing push subscription and restore saved time
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then(async (sub) => {
          if (sub) {
            subRef.current = sub;
            setNotifStatus("on");
            // Restore saved notification time from server
            const res = await fetch("/api/push/subscribe");
            const data = await res.json();
            if (data.notification_time) {
              const local = toLocalTime(data.notification_time);
              setNotifTime(local);
              setSavedNotifTime(local);
            }
          }
        });
      });
    }

    if (Notification.permission === "denied") setNotifStatus("denied");
  }, []);

  const todayAffirmation = affirmations.find((a) => a.is_active);

  async function generate() {
    setGenerating(true);
    setSuggestion("");
    const res = await fetch("/api/affirmations/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value_category: selectedCategory, context, locale }),
    });
    if (!res.ok || !res.body) { setGenerating(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      setSuggestion(text);
    }
    setGenerating(false);
  }

  async function saveSuggestion() {
    await saveAffirmation(suggestion, selectedCategory, "daily");
    setSuggestion("");
  }

  async function saveAffirmation(text: string, category: Category, frequency: Frequency) {
    setSaving(true);
    const res = await fetch("/api/affirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, value_category: category, frequency }),
    });
    if (res.ok) {
      const created = await res.json();
      setAffirmations((prev) => [created, ...prev]);
      setManualText("");
      setAddingManual(false);
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/affirmations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      setAffirmations((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
    }
  }

  async function deleteAffirmation(id: string) {
    const res = await fetch(`/api/affirmations/${id}`, { method: "DELETE" });
    if (res.ok) setAffirmations((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  async function enableNotifications() {
    setNotifError(null);

    if (!("Notification" in window)) {
      setNotifError("Notifications not supported in this browser.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotifError("Push notifications not supported. Try Chrome or Edge.");
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setNotifError("Push notifications not configured yet (missing VAPID key).");
      return;
    }

    setNotifStatus("pending");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") { setNotifStatus("denied"); return; }
      if (permission !== "granted") { setNotifStatus("idle"); return; }

      // Timeout after 8s to avoid hanging on serviceWorker.ready
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service worker not ready — try refreshing the page.")), 8000)
        ),
      ]);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      subRef.current = sub;

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), notification_time: toUtcTime(notifTime) }),
      });
      setSavedNotifTime(notifTime);
      setNotifStatus("on");
    } catch (err) {
      setNotifStatus("idle");
      setNotifError(err instanceof Error ? err.message : "Failed to enable notifications.");
    }
  }

  async function disableNotifications() {
    if (subRef.current) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subRef.current.endpoint }),
      });
      await subRef.current.unsubscribe();
      subRef.current = null;
    }
    setNotifStatus("idle");
  }

  async function updateSchedule() {
    if (!subRef.current) return;
    setUpdatingTime(true);
    setNotifError(null);
    try {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subRef.current.toJSON(), notification_time: toUtcTime(notifTime) }),
      });
      setSavedNotifTime(notifTime);
      setEditingTime(false);
    } catch {
      setNotifError("Failed to update schedule.");
    } finally {
      setUpdatingTime(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center px-4 py-12 flex-1">
        <div className="w-5 h-5 border-2 border-[#7C9082] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
          <button
            onClick={() => setAddingManual((v) => !v)}
            className="text-sm px-4 py-2 rounded-xl border border-[#7C9082] text-[#7C9082] hover:bg-[#7C9082]/5 transition"
          >
            {addingManual ? "Cancel" : `+ ${t("addButton")}`}
          </button>
        </div>

        {/* Manual add form */}
        {addingManual && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="I am becoming someone who..."
              rows={2}
              className="w-full text-sm text-[#2D3B35] placeholder:text-slate-300 bg-transparent resize-none outline-none border-b border-slate-100 pb-2"
            />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setManualCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    manualCategory === cat
                      ? "bg-[#7C9082] text-white border-[#7C9082]"
                      : "border-slate-200 text-slate-500 hover:border-[#7C9082]"
                  }`}
                >
                  {t(`categories.${cat}`)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{t("frequencyLabel")}</span>
              {(["daily", "weekdays", "weekends"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setManualFrequency(f)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    manualFrequency === f
                      ? "bg-slate-700 text-white border-slate-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {t(`frequencies.${f}`)}
                </button>
              ))}
            </div>
            <button
              onClick={() => saveAffirmation(manualText, manualCategory, manualFrequency)}
              disabled={saving || !manualText.trim()}
              className="px-5 py-2 rounded-xl bg-[#7C9082] text-white text-sm hover:bg-[#6a7d6f] disabled:opacity-50 transition"
            >
              {saving ? t("savingButton") : t("saveButton")}
            </button>
          </div>
        )}

        {/* Today's affirmation card + notifications */}
        {todayAffirmation ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{t("todayCard")}</p>
            <p className="text-lg font-light text-[#2D3B35] italic leading-relaxed">
              &ldquo;{todayAffirmation.text}&rdquo;
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {notifStatus === "denied" ? (
                <span className="text-xs text-red-400">Notifications blocked in browser settings</span>
              ) : notifStatus === "on" ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7C9082]">{t("notificationsEnabled")}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <button onClick={disableNotifications} className="text-xs text-slate-400 hover:text-red-400 transition">
                      Turn off
                    </button>
                  </div>
                  {editingTime ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={notifTime}
                        onChange={(e) => setNotifTime(e.target.value)}
                        className="text-xs border border-[#7C9082]/40 rounded-lg px-2 py-1 text-slate-600 outline-none focus:border-[#7C9082]"
                      />
                      <button
                        onClick={updateSchedule}
                        disabled={updatingTime}
                        className="text-xs px-3 py-1 rounded-lg bg-[#7C9082] text-white hover:bg-[#6a7d6f] disabled:opacity-50 transition"
                      >
                        {updatingTime ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingTime(false); setNotifTime(savedNotifTime); }}
                        className="text-xs text-slate-400 hover:text-slate-600 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">Daily at {savedNotifTime} (local)</span>
                      <button
                        onClick={() => setEditingTime(true)}
                        className="text-slate-400 hover:text-[#7C9082] transition"
                        aria-label="Edit time"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={notifTime}
                    onChange={(e) => setNotifTime(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-500"
                  />
                  <button
                    onClick={enableNotifications}
                    disabled={notifStatus === "pending"}
                    className="text-xs px-3 py-1 rounded-lg bg-[#7C9082]/10 text-[#7C9082] hover:bg-[#7C9082]/20 disabled:opacity-50 transition"
                  >
                    {notifStatus === "pending" ? "Requesting…" : `🔔 ${t("enableNotifications")}`}
                  </button>
                </div>
              )}
            </div>
            {notifError && (
              <p className="text-xs text-red-400 mt-1">{notifError}</p>
            )}
          </div>
        ) : affirmations.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center space-y-1">
            <p className="text-slate-500 text-sm">{t("noAffirmations")}</p>
            <p className="text-slate-400 text-xs">{t("noAffirmationsHint")}</p>
          </div>
        )}

        {/* AI Coach */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest">{t("aiCoachTitle")}</h2>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-2">{t("valueLabel")}</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1 rounded-full border transition ${
                      selectedCategory === cat
                        ? "bg-[#7C9082] text-white border-[#7C9082]"
                        : "border-slate-200 text-slate-500 hover:border-[#7C9082]"
                    }`}
                  >
                    {t(`categories.${cat}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">{t("contextLabel")}</p>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t("contextPlaceholder")}
                rows={2}
                className="w-full text-sm text-[#2D3B35] placeholder:text-slate-300 bg-slate-50 rounded-xl px-3 py-2 resize-none outline-none border border-slate-100 focus:border-[#7C9082]/30 transition"
              />
            </div>

            <button
              onClick={generate}
              disabled={generating}
              className="px-5 py-2 rounded-xl bg-[#7C9082] text-white text-sm hover:bg-[#6a7d6f] disabled:opacity-60 transition"
            >
              {generating ? t("generatingButton") : t("generateButton")}
            </button>

            {(suggestion || generating) && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-sm italic text-[#2D3B35] leading-relaxed min-h-[1.5rem]">
                  {suggestion || <span className="text-slate-300">Writing…</span>}
                </p>
                {suggestion && !generating && (
                  <div className="flex gap-3">
                    <button
                      onClick={saveSuggestion}
                      disabled={saving}
                      className="text-sm px-4 py-1.5 rounded-xl bg-[#7C9082] text-white hover:bg-[#6a7d6f] disabled:opacity-60 transition"
                    >
                      {saving ? t("savingButton") : t("saveButton")}
                    </button>
                    <button
                      onClick={generate}
                      className="text-sm px-4 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-400 transition"
                    >
                      {t("tryAgainButton")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Affirmation list */}
        {affirmations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest">
              {t("title")} ({affirmations.length})
            </h2>
            {affirmations.map((a) => (
              <div
                key={a.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm transition ${
                  a.is_active ? "border-slate-100" : "border-slate-100 opacity-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm text-[#2D3B35] leading-relaxed italic flex-1 ${!a.is_active && "line-through"}`}>
                    &ldquo;{a.text}&rdquo;
                  </p>
                  <button
                    onClick={() => toggleActive(a.id, a.is_active)}
                    className={`mt-0.5 w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                      a.is_active ? "bg-[#7C9082]" : "bg-slate-200"
                    }`}
                    aria-label="Toggle active"
                  >
                    <span className={`block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${a.is_active ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                      {t(`categories.${a.value_category}`)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                      {t(`frequencies.${a.frequency}`)}
                    </span>
                  </div>
                  {deletingId === a.id ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-slate-400">{t("deleteConfirm")}</span>
                      <button onClick={() => deleteAffirmation(a.id)} className="text-xs text-red-400 hover:text-red-600">Yes</button>
                      <button onClick={() => setDeletingId(null)} className="text-xs text-slate-400 hover:text-slate-600">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(a.id)} className="text-xs text-slate-300 hover:text-red-400 transition">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
