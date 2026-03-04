"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale() {
    const next = locale === "en" ? "es" : "en";
    const newPath = pathname.replace(`/${locale}`, `/${next}`);
    router.push(newPath);
  }

  return (
    <button
      onClick={switchLocale}
      className="px-2 py-1 rounded text-xs text-slate-400 hover:text-[#7C9082] hover:bg-slate-100 transition font-mono tracking-wide"
      aria-label={locale === "en" ? "Cambiar a español" : "Switch to English"}
    >
      {locale === "en" ? "ES" : "EN"}
    </button>
  );
}
