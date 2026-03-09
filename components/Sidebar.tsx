"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "./LanguageSwitcher";

// ─── Icons ────────────────────────────────────────────────────────────────────
const SZ = { sm: 17, md: 20 } as const;

function IconHome({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const s = SZ[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconHeart({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const s = SZ[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function IconPen({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const s = SZ[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

function IconCheck({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const s = SZ[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconBrain({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const s = SZ[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function IconStar({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const s = SZ[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconBriefcase({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const s = SZ[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

export default function Sidebar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isTherapist, setIsTherapist] = useState(false);

  useEffect(() => {
    fetch("/api/therapist/me")
      .then((r) => r.json())
      .then((d) => { setIsTherapist(!!d?.therapist); })
      .catch(() => {});
  }, [pathname]); // re-check on every navigation so activation reflects immediately

  const LINKS = [
    { href: `/${locale}/dashboard`,       label: t("dashboard"),      Icon: IconHome      },
    { href: `/${locale}/checkin`,         label: t("checkin"),        Icon: IconHeart     },
    { href: `/${locale}/journal`,         label: t("journal"),        Icon: IconPen       },
    { href: `/${locale}/habits`,          label: t("habits"),         Icon: IconCheck     },
    { href: `/${locale}/thought-records`, label: t("thoughtRecords"), Icon: IconBrain     },
    { href: `/${locale}/affirmations`,    label: t("affirmations"),   Icon: IconStar      },
    ...(isTherapist ? [{ href: `/${locale}/portal`, label: t("portal"), Icon: IconBriefcase }] : []),
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
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-20" style={{ width: "232px", background: "#F5F4EF", borderRight: "1px solid #E8E5DC" }}
>

        {/* Brand — ghost icon + wordmark */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid #E8E5DC" }}>
          <Image
            src="/logo-icon.png"
            alt=""
            width={400}
            height={400}
            className="w-8 h-8 object-contain flex-shrink-0"
            unoptimized
          />
          <div className="leading-tight">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#3E4A3D", letterSpacing: "0.12em" }}>
              Phantom
            </p>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#3E4A3D", letterSpacing: "0.12em" }}>
              Prophet
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "text-[#3E4A3D]"
                    : "text-[#9AA89E] hover:text-[#3E4A3D] hover:bg-[#ECEAE3]"
                }`}
                style={active ? { background: "#E2E8E3", color: "#3E4A3D" } : {}}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: "#7C9082" }}
                  />
                )}
                <span style={{ color: active ? "#7C9082" : undefined }}>
                  <Icon active={active} />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 pt-3" style={{ borderTop: "1px solid #E8E5DC" }}>
          <div className="px-3 py-1.5 mb-0.5">
            <LanguageSwitcher />
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: "#B0A99E" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#3E4A3D";
              (e.currentTarget as HTMLButtonElement).style.background = "#ECEAE3";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#B0A99E";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {t("signOut")}
          </button>
        </div>
      </aside>

      {/* ── Mobile: top header ──────────────────────────────────────────── */}
      <header className="flex lg:hidden fixed top-0 left-0 right-0 z-20 items-center justify-between px-4 h-12"
        style={{ background: "#F5F4EF", borderBottom: "1px solid #E8E5DC" }}>
        <div className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="Phantom Prophet" width={400} height={400} className="w-7 h-7 object-contain" unoptimized />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#3E4A3D", letterSpacing: "0.12em" }}>
            Phantom Prophet
          </span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button
            onClick={handleSignOut}
            className="text-xs px-2 py-1.5 rounded-lg transition"
            style={{ color: "#9AA89E" }}
          >
            {t("signOut")}
          </button>
        </div>
      </header>

      {/* ── Mobile: bottom tab bar ───────────────────────────────────────── */}
      <nav className="flex lg:hidden fixed bottom-0 left-0 right-0 z-20"
        style={{ background: "#F5F4EF", borderTop: "1px solid #E8E5DC" }}>
        {LINKS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition"
              style={{ color: active ? "#7C9082" : "#9AA89E" }}
            >
              <Icon active={active} size="md" />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
