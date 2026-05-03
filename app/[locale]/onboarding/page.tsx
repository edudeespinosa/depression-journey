"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

const TOTAL_STEPS = 4;

function StepIcon({ step }: { step: number }) {
  const className = "w-10 h-10 text-[#7C9082]";
  const props = {
    "aria-hidden": true as const,
    focusable: "false" as const,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    className,
  };

  if (step === 1) {
    return (
      <svg {...props}>
        <path d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.727 12.727.707.707M3 12h1m16 0h1M4.22 19.78l.707-.707M18.364 5.636l.707-.707" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  if (step === 2) {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 10c0-.552.672-1 1.5-1s1.5.448 1.5 1-.672 1-1.5 1S9 10.552 9 10z" fill="currentColor" stroke="none" />
        <path d="M14 10c0-.552.672-1 1.5-1s1.5.448 1.5 1-.672 1-1.5 1S14 10.552 14 10z" fill="currentColor" stroke="none" />
        <path d="M8.5 14.5s1 2 3.5 2 3.5-2 3.5-2" />
      </svg>
    );
  }
  if (step === 3) {
    return (
      <svg {...props}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M12 22V12" />
      <path d="M12 12C12 12 9 9.5 6 10c-3 .5-4 3-4 3s3-1 6 1c3 2 4 6 4 6s1-4 4-6c3-2 6-1 6-1s-1-2.5-4-3c-3-.5-6 2-6 2z" />
    </svg>
  );
}

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(1);

  function next() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      router.push(`/${locale}/dashboard`);
    }
  }

  function skip() {
    router.push(`/${locale}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center px-6">

      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={`Step ${step} of ${TOTAL_STEPS}`}
        className="flex gap-2 mb-14"
      >
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 <= step ? "w-8 bg-[#7C9082]" : "w-1.5 bg-slate-200"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-xs text-center space-y-8">

        <div className="w-20 h-20 mx-auto rounded-2xl bg-[#7C9082]/10 flex items-center justify-center">
          <StepIcon step={step} />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-[#2D3B35]">
            {t(`step${step}Title` as "step1Title" | "step2Title" | "step3Title" | "step4Title")}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t(`step${step}Body` as "step1Body" | "step2Body" | "step3Body" | "step4Body")}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={next}
            className="w-full bg-[#7C9082] text-white py-3 rounded-xl text-sm font-medium
                       hover:bg-[#6A7C70] transition"
          >
            {step === TOTAL_STEPS ? t("finishButton") : t("nextButton")}
          </button>
          {step < TOTAL_STEPS && (
            <button
              onClick={skip}
              className="w-full text-sm text-slate-400 hover:text-[#7C9082] transition py-1"
            >
              {t("skipButton")}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
