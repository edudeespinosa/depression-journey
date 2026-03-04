"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/journal", label: "Journal" },
  { href: "/habits",  label: "Habits"  },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Active if exact match or starts with (for /journal/history)
  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="w-full bg-[#FDFCF8] border-b border-slate-100 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-sm font-light tracking-wide text-[#3E4A3D] hover:text-[#7C9082] transition"
        >
          Phantom Prophet
        </Link>

        {/* Links + sign out */}
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

          <div className="w-px h-4 bg-slate-200 mx-2" />

          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
