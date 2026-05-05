"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";

function FeatureIcon({ type }: { type: "checkin" | "journal" | "thoughts" | "habits" }) {
  const props = {
    "aria-hidden": true as const,
    focusable: "false" as const,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    className: "w-6 h-6 text-[#7C9082]",
  };

  if (type === "checkin") return (
    <svg {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth={2} />
    </svg>
  );
  if (type === "journal") return (
    <svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
  if (type === "thoughts") return (
    <svg {...props}>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r=".5" fill="currentColor" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
  return (
    <svg {...props}>
      <path d="M12 22V12" />
      <path d="M12 12C12 12 9 9.5 6 10c-3 .5-4 3-4 3s3-1 6 1c3 2 4 6 4 6s1-4 4-6c3-2 6-1 6-1s-1-2.5-4-3c-3-.5-6 2-6 2z" />
    </svg>
  );
}

const FEATURES = ["checkin", "journal", "thoughts", "habits"] as const;

const STEPS = [
  {
    num: "01",
    labelKey: "step1Label" as const,
    bodyKey: "step1Body" as const,
  },
  {
    num: "02",
    labelKey: "step2Label" as const,
    bodyKey: "step2Body" as const,
  },
  {
    num: "03",
    labelKey: "step3Label" as const,
    bodyKey: "step3Body" as const,
  },
];

export default function LandingPage() {
  const t = useTranslations("landing");
  const locale = useLocale();

  return (
    <div className="bg-[#FDFCF8] text-[#2D3B35]">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav
        aria-label={t("nav.ariaLabel")}
        className="fixed top-0 inset-x-0 z-20 bg-[#FDFCF8]/90 backdrop-blur-sm border-b border-slate-100"
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <Image
              src="/logo-icon.png"
              alt="Phantom Prophet"
              width={28}
              height={28}
              className="w-7 h-7 rounded-md"
              unoptimized
            />
            <span className="text-sm font-medium">Phantom Prophet</span>
          </Link>
          <Link
            href={`/${locale}/login`}
            className="text-sm text-slate-500 hover:text-[#2D3B35] transition"
          >
            {t("nav.signIn")}
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-14 text-center">
        <Image
          src="/logo.png"
          alt="Phantom Prophet"
          width={832}
          height={1248}
          className="w-24 h-auto mb-10"
          priority
          unoptimized
        />
        <h1 className="text-4xl sm:text-5xl font-semibold text-[#2D3B35] max-w-xl leading-tight tracking-tight">
          {t("hero.headline")}
        </h1>
        <p className="mt-5 text-base sm:text-lg text-slate-500 max-w-md leading-relaxed">
          {t("hero.tagline")}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href={`/${locale}/login?action=signup`}
            className="px-7 py-3 bg-[#7C9082] text-white rounded-xl text-sm font-medium
                       hover:bg-[#6A7C70] transition"
          >
            {t("hero.ctaSignup")}
          </Link>
          <Link
            href={`/${locale}/login`}
            className="px-7 py-3 rounded-xl border border-slate-200 text-sm text-[#3E4A3D]
                       hover:bg-slate-50 transition"
          >
            {t("hero.ctaSignin")}
          </Link>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="py-28 px-6" aria-labelledby="features-heading">
        <div className="max-w-4xl mx-auto">
          <h2
            id="features-heading"
            className="text-2xl font-semibold text-center mb-14"
          >
            {t("features.title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((key) => (
              <div
                key={key}
                className="bg-white rounded-2xl border border-slate-100 p-7 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7C9082]/10 flex items-center justify-center">
                  <FeatureIcon type={key} />
                </div>
                <h3 className="text-base font-semibold text-[#2D3B35]">
                  {t(`features.${key}.title`)}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t(`features.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section
        className="py-28 px-6 bg-white"
        aria-labelledby="how-it-works-heading"
      >
        <div className="max-w-4xl mx-auto">
          <h2
            id="how-it-works-heading"
            className="text-2xl font-semibold text-center mb-16"
          >
            {t("howItWorks.title")}
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {STEPS.map(({ num, labelKey, bodyKey }) => (
              <li key={num} className="space-y-3">
                <span className="text-5xl font-bold text-[#7C9082]/20 leading-none select-none">
                  {num}
                </span>
                <h3 className="text-base font-semibold text-[#2D3B35] pt-1">
                  {t(`howItWorks.${labelKey}`)}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t(`howItWorks.${bodyKey}`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Therapist portal ────────────────────────────────────────── */}
      <section className="py-28 px-6" aria-labelledby="therapist-heading">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#3E4A3D]/5 rounded-3xl px-10 py-12 flex flex-col md:flex-row gap-10 items-start md:items-center">
            <div className="flex-1 space-y-3">
              <h2
                id="therapist-heading"
                className="text-xl font-semibold text-[#2D3B35]"
              >
                {t("therapist.title")}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                {t("therapist.body")}
              </p>
            </div>
            <a
              href={`mailto:${t("therapist.email")}`}
              className="shrink-0 px-6 py-3 rounded-xl border border-[#7C9082] text-sm
                         text-[#7C9082] font-medium hover:bg-[#7C9082] hover:text-white
                         transition whitespace-nowrap"
            >
              {t("therapist.emailCta")}
            </a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-[#3E4A3D] text-white text-center">
        <div className="max-w-md mx-auto space-y-5">
          <h2 className="text-3xl font-semibold">{t("finalCta.headline")}</h2>
          <p className="text-[#FDFCF8]/70 text-sm leading-relaxed">
            {t("finalCta.body")}
          </p>
          <Link
            href={`/${locale}/login?action=signup`}
            className="inline-block mt-4 px-8 py-3 bg-[#7C9082] text-white rounded-xl
                       text-sm font-medium hover:bg-[#6A7C70] transition"
          >
            {t("finalCta.button")}
          </Link>
        </div>
      </section>

    </div>
  );
}
