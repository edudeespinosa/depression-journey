"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

type Suggestion = {
  type: "insight" | "nudge" | "celebration";
  message: string;
  action_label?: string;
  action_href?: string;
};

const ACCENT = {
  insight: {
    bg: "bg-[#f0f4f1]",
    border: "border-[#c8d5c9]",
    icon: "◈",
    iconBg: "bg-[#7C9082]/15",
    iconColor: "text-[#7C9082]",
  },
  nudge: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    icon: "↗",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-500",
  },
  celebration: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: "✦",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-500",
  },
};

export default function AgentSuggestion() {
  const locale = useLocale();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/agent", { method: "POST" })
      .then((r) => r.json())
      .then((data: Suggestion) => {
        setSuggestion(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />;
  }

  if (!suggestion || dismissed) return null;

  const a = ACCENT[suggestion.type] ?? ACCENT.nudge;

  return (
    <div className={`rounded-2xl border p-4 ${a.bg} ${a.border}`}>
      <div className="flex gap-3 items-start">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${a.iconBg} ${a.iconColor}`}
        >
          {a.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#2D3B35] leading-relaxed">{suggestion.message}</p>
          {suggestion.action_label && suggestion.action_href && (
            <Link
              href={`/${locale}${suggestion.action_href}`}
              className="inline-block mt-2 text-xs font-medium text-[#7C9082] hover:text-[#3E4A3D] transition"
            >
              {suggestion.action_label} →
            </Link>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-slate-300 hover:text-slate-400 transition flex-shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
