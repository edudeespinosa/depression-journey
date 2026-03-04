"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export default function Home() {
  const t = useTranslations("landing");
  const locale = useLocale();

  return (
    <main className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center p-6 text-[#3E4A3D]">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-light tracking-tight">{t("headline")}</h1>

        <p className="text-lg leading-relaxed text-slate-600">{t("tagline")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <Link href={`/${locale}/journal`} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-[#7C9082] hover:shadow-md transition group">
            <span className="block text-2xl mb-2">✍️</span>
            <h3 className="font-medium group-hover:text-[#7C9082] transition">{t("journalCard.title")}</h3>
            <p className="text-xs text-slate-400 mt-1">{t("journalCard.subtitle")}</p>
          </Link>
          <Link href={`/${locale}/habits`} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-[#7C9082] hover:shadow-md transition group">
            <span className="block text-2xl mb-2">🌿</span>
            <h3 className="font-medium group-hover:text-[#7C9082] transition">{t("habitsCard.title")}</h3>
            <p className="text-xs text-slate-400 mt-1">{t("habitsCard.subtitle")}</p>
          </Link>
          <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm opacity-50">
            <span className="block text-2xl mb-2">🍲</span>
            <h3 className="font-medium">{t("nourishCard.title")}</h3>
            <p className="text-xs text-slate-400 mt-1">{t("nourishCard.subtitle")}</p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/journal`}
            className="bg-[#7C9082] text-white px-8 py-3 rounded-lg hover:bg-[#6A7C70] transition text-sm"
          >
            {t("ctaJournal")}
          </Link>
          <Link
            href={`/${locale}/habits`}
            className="border border-slate-200 text-slate-600 px-8 py-3 rounded-lg hover:border-[#7C9082] hover:text-[#7C9082] transition text-sm"
          >
            {t("ctaHabits")}
          </Link>
        </div>

        <p className="text-xs text-slate-300 pt-4">
          <Link href={`/${locale}/login`} className="hover:text-slate-400 transition">{t("signIn")}</Link>
        </p>
      </div>
    </main>
  );
}
