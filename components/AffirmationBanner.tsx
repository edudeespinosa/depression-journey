"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

type Affirmation = { id: string; text: string; value_category: string; is_active: boolean };

export default function AffirmationBanner() {
  const locale = useLocale();
  const [affirmation, setAffirmation] = useState<Affirmation | null>(null);

  useEffect(() => {
    fetch("/api/affirmations")
      .then((r) => r.json())
      .then((data: Affirmation[]) => {
        const active = Array.isArray(data) ? data.filter((a) => a.is_active) : [];
        if (!active.length) return;
        // Cycle through affirmations across sessions
        const idx = Number(sessionStorage.getItem("affirmation_idx") ?? "0") % active.length;
        sessionStorage.setItem("affirmation_idx", String((idx + 1) % active.length));
        setAffirmation(active[idx]);
      })
      .catch(() => null);
  }, []);

  if (!affirmation) return null;

  return (
    <Link href={`/${locale}/affirmations`} className="block">
      <div className="bg-[#7C9082]/8 border border-[#7C9082]/20 rounded-2xl px-5 py-4 hover:border-[#7C9082]/40 transition group">
        <div className="flex items-start gap-3">
          <span className="text-[#7C9082] text-lg leading-none mt-0.5 flex-shrink-0">✦</span>
          <p className="text-sm italic text-[#2D3B35] leading-relaxed group-hover:text-[#7C9082] transition">
            {affirmation.text}
          </p>
        </div>
      </div>
    </Link>
  );
}
