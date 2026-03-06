"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Step = 1 | 2 | 3;
type PageState = "form" | "saving" | "saved";

type ThoughtRecord = {
  id: string;
  situation: string;
  automatic_thought: string;
  emotion: string;
  intensity: number;
  evidence_for: string | null;
  evidence_against: string | null;
  balanced_thought: string | null;
  outcome_emotion: string | null;
  outcome_intensity: number | null;
  created_at: string;
};

function IntensitySlider({
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#7C9082]"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{lowLabel}</span>
        <span className="text-[#2D3B35] font-medium">{value}/10</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function IntensityBadge({ value }: { value: number }) {
  const color =
    value >= 8 ? "bg-red-100 text-red-700" :
    value >= 5 ? "bg-amber-100 text-amber-700" :
    "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {value}/10
    </span>
  );
}

function RecordItem({
  record,
  onDelete,
  t,
}: {
  record: ThoughtRecord;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const date = new Date(record.created_at);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2D3B35] truncate">{record.situation}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">{dateStr}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-[#7C9082]">{record.emotion}</span>
            <IntensityBadge value={record.intensity} />
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-slate-50">
          <Field label="Automatic thought" value={record.automatic_thought} />
          {record.evidence_for && <Field label="Evidence for" value={record.evidence_for} />}
          {record.evidence_against && <Field label="Evidence against" value={record.evidence_against} />}
          {record.balanced_thought && <Field label="Balanced thought" value={record.balanced_thought} />}
          {record.outcome_emotion && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Feeling after:</span>
              <span className="text-xs text-[#7C9082]">{record.outcome_emotion}</span>
              {record.outcome_intensity && <IntensityBadge value={record.outcome_intensity} />}
            </div>
          )}

          {/* Delete */}
          <div className="pt-1">
            {confirming ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDelete(record.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  {t("deleteConfirm.yes")}
                </button>
                <span className="text-slate-300">·</span>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  {t("deleteConfirm.no")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-xs text-slate-300 hover:text-red-400 transition"
              >
                ✕ delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-[#2D3B35]">{value}</p>
    </div>
  );
}

export default function ThoughtRecordsPage() {
  const t = useTranslations("thoughtRecords");

  // Form state
  const [step, setStep] = useState<Step>(1);
  const [pageState, setPageState] = useState<PageState>("form");

  // Step 1
  const [situation, setSituation] = useState("");
  const [automaticThought, setAutomaticThought] = useState("");

  // Step 2
  const [emotion, setEmotion] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [evidenceFor, setEvidenceFor] = useState("");
  const [evidenceAgainst, setEvidenceAgainst] = useState("");

  // Step 3
  const [balancedThought, setBalancedThought] = useState("");
  const [outcomeEmotion, setOutcomeEmotion] = useState("");
  const [outcomeIntensity, setOutcomeIntensity] = useState(5);
  const [hasOutcomeIntensity, setHasOutcomeIntensity] = useState(false);

  // History
  const [records, setRecords] = useState<ThoughtRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetch("/api/thought-records")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecords(data);
      })
      .finally(() => setLoadingHistory(false));
  }, []);

  function resetForm() {
    setStep(1);
    setPageState("form");
    setSituation("");
    setAutomaticThought("");
    setEmotion("");
    setIntensity(5);
    setEvidenceFor("");
    setEvidenceAgainst("");
    setBalancedThought("");
    setOutcomeEmotion("");
    setOutcomeIntensity(5);
    setHasOutcomeIntensity(false);
  }

  async function handleSave() {
    setPageState("saving");
    const body = {
      situation,
      automatic_thought: automaticThought,
      emotion,
      intensity,
      evidence_for: evidenceFor || null,
      evidence_against: evidenceAgainst || null,
      balanced_thought: balancedThought || null,
      outcome_emotion: outcomeEmotion || null,
      outcome_intensity: hasOutcomeIntensity ? outcomeIntensity : null,
    };

    try {
      const res = await fetch("/api/thought-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const newRecord: ThoughtRecord = await res.json();
      setRecords((prev) => [newRecord, ...prev]);
      setPageState("saved");
    } catch {
      setPageState("form");
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/thought-records/${id}`, { method: "DELETE" });
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  const step1Valid = situation.trim().length > 0 && automaticThought.trim().length > 0;
  const step2Valid = emotion.trim().length > 0;

  const STEPS = [t("step1Title"), t("step2Title"), t("step3Title")];

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-light tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">

          {pageState === "saved" ? (
            /* ── Saved state ─────────────────────────────────────────── */
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-[#7C9082]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#7C9082]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">{t("savedMessage")}</p>
              <button
                onClick={resetForm}
                className="text-sm text-[#7C9082] hover:text-[#5a6b60] transition"
              >
                {t("addAnotherButton")}
              </button>
            </div>
          ) : (
            <>
              {/* ── Step indicator ─────────────────────────────────────── */}
              <div className="flex items-center gap-2">
                {STEPS.map((label, i) => {
                  const n = (i + 1) as Step;
                  const active = step === n;
                  const done = step > n;
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 ${active ? "text-[#7C9082]" : done ? "text-slate-400" : "text-slate-300"}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold border ${
                          active ? "border-[#7C9082] bg-[#7C9082] text-white" :
                          done ? "border-slate-300 bg-slate-100 text-slate-400" :
                          "border-slate-200 text-slate-300"
                        }`}>
                          {done ? "✓" : n}
                        </div>
                        <span className="text-xs font-medium hidden sm:block">{label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`h-px w-6 ${done ? "bg-slate-300" : "bg-slate-100"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Step 1: Situation + Thought ───────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("situationLabel")}</label>
                    <textarea
                      rows={3}
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      placeholder={t("situationPlaceholder")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#7C9082] resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("thoughtLabel")}</label>
                    <textarea
                      rows={3}
                      value={automaticThought}
                      onChange={(e) => setAutomaticThought(e.target.value)}
                      placeholder={t("thoughtPlaceholder")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#7C9082] resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep(2)}
                      disabled={!step1Valid}
                      className="px-5 py-2 rounded-xl bg-[#7C9082] text-white text-sm font-medium hover:bg-[#6a7d6f] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {t("nextButton")}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Emotion + Evidence ────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("emotionLabel")}</label>
                    <input
                      type="text"
                      value={emotion}
                      onChange={(e) => setEmotion(e.target.value)}
                      placeholder={t("emotionPlaceholder")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#7C9082]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("intensityLabel")}</label>
                    <IntensitySlider
                      value={intensity}
                      onChange={setIntensity}
                      lowLabel={t("intensityLow")}
                      highLabel={t("intensityHigh")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("evidenceForLabel")}</label>
                    <textarea
                      rows={2}
                      value={evidenceFor}
                      onChange={(e) => setEvidenceFor(e.target.value)}
                      placeholder={t("evidenceForPlaceholder")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#7C9082] resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("evidenceAgainstLabel")}</label>
                    <textarea
                      rows={2}
                      value={evidenceAgainst}
                      onChange={(e) => setEvidenceAgainst(e.target.value)}
                      placeholder={t("evidenceAgainstPlaceholder")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#7C9082] resize-none"
                    />
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                    >
                      {t("backButton")}
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!step2Valid}
                      className="px-5 py-2 rounded-xl bg-[#7C9082] text-white text-sm font-medium hover:bg-[#6a7d6f] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {t("nextButton")}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Balanced view ─────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("balancedLabel")}</label>
                    <textarea
                      rows={3}
                      value={balancedThought}
                      onChange={(e) => setBalancedThought(e.target.value)}
                      placeholder={t("balancedPlaceholder")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#7C9082] resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#2D3B35]">{t("outcomeEmotionLabel")}</label>
                    <input
                      type="text"
                      value={outcomeEmotion}
                      onChange={(e) => {
                        setOutcomeEmotion(e.target.value);
                        if (e.target.value && !hasOutcomeIntensity) setHasOutcomeIntensity(true);
                        if (!e.target.value) setHasOutcomeIntensity(false);
                      }}
                      placeholder={t("outcomeEmotionPlaceholder")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#7C9082]"
                    />
                  </div>
                  {hasOutcomeIntensity && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[#2D3B35]">{t("outcomeIntensityLabel")}</label>
                      <IntensitySlider
                        value={outcomeIntensity}
                        onChange={setOutcomeIntensity}
                        lowLabel={t("intensityLow")}
                        highLabel={t("intensityHigh")}
                      />
                    </div>
                  )}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                    >
                      {t("backButton")}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={pageState === "saving"}
                      className="px-5 py-2 rounded-xl bg-[#7C9082] text-white text-sm font-medium hover:bg-[#6a7d6f] disabled:opacity-60 transition"
                    >
                      {pageState === "saving" ? t("savingButton") : t("saveButton")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── History ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">{t("historyTitle")}</h2>
          {loadingHistory ? (
            <div className="text-sm text-slate-300 py-4 text-center">…</div>
          ) : records.length === 0 ? (
            <p className="text-sm text-slate-300 py-4 text-center">{t("emptyHistory")}</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <RecordItem key={r.id} record={r} onDelete={handleDelete} t={t} />
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
