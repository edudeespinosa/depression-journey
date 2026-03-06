"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Nav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const LINKS = [
    { href: `/${locale}/dashboard`, label: t("dashboard") },
    { href: `/${locale}/checkin`,   label: t("checkin") },
    { href: `/${locale}/journal`,   label: t("journal") },
    { href: `/${locale}/habits`,    label: t("habits")  },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="w-full bg-[#FDFCF8] border-b border-slate-100 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="text-sm font-light tracking-wide text-[#3E4A3D] hover:text-[#7C9082] transition"
        >
          {t("brand")}
        </Link>

        <div className="flex items-center gap-1">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                isActive(href)
                  ? "bg-[#7C9082]/10 text-[#7C9082] font-medium"
                  : "text-slate-500 hover:text-[#3E4A3D] hover:bg-slate-100"
              }`}
            >
              {label}
            </Link>
          ))}

          <LanguageSwitcher />

          <div className="w-px h-4 bg-slate-200 mx-2" />

          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    </nav>
  );
}
