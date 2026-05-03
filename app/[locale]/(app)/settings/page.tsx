"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type SaveState = "idle" | "saving" | "saved" | "error";

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      style={{
        position: "relative",
        flexShrink: 0,
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        padding: 0,
        backgroundColor: checked ? "#7C9082" : "#cbd5e1",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        outline: "none",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "transform 0.2s",
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#7C9082] mb-3">
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
      {children}
    </div>
  );
}

function Row({
  label,
  description,
  right,
}: {
  label: string;
  description?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#2D3B35]">{label}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [emailNudges, setEmailNudges] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Load notification prefs
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((d) => {
        setEmailNudges(d.email_notifications);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load user email from Supabase client session
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleEmailToggle(value: boolean) {
    setEmailNudges(value);
    setSaveState("saving");
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_notifications: value }),
      });
      setSaveState(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }

  return (
    <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-light tracking-tight text-[#2D3B35]">{t("title")}</h1>
        </div>

        {/* Notifications */}
        <section aria-labelledby="notifications-heading">
          <SectionLabel>
            <span id="notifications-heading">{t("notifications")}</span>
          </SectionLabel>
          <Card>
            <Row
              label={t("emailNudges")}
              description={t("emailNudgesDesc")}
              right={
                loading ? (
                  <div className="w-11 h-6 rounded-full bg-slate-100 motion-safe:animate-pulse" />
                ) : (
                  <Toggle
                    checked={emailNudges}
                    onChange={handleEmailToggle}
                    disabled={saveState === "saving"}
                    label={t("emailNudges")}
                  />
                )
              }
            />
          </Card>
          <div className="mt-2 ml-1 h-4">
            {saveState === "saved" && (
              <p role="status" aria-live="polite" className="text-xs text-[#7C9082]">
                {t("saved")}
              </p>
            )}
            {saveState === "error" && (
              <p role="alert" className="text-xs text-red-600">
                {t("saveError")}
              </p>
            )}
          </div>
        </section>

        {/* Account */}
        <section aria-labelledby="account-heading">
          <SectionLabel>
            <span id="account-heading">{t("account")}</span>
          </SectionLabel>
          <Card>
            <Row
              label={t("email")}
              right={
                <span className="text-sm text-slate-400 font-mono truncate max-w-[200px]">
                  {userEmail ?? "—"}
                </span>
              }
            />
          </Card>
        </section>
      </div>
    </main>
  );
}
