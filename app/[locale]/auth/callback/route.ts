import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ locale: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/${locale}/reset-password`);
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const now = Date.now();
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const confirmedAt = user.email_confirmed_at
        ? new Date(user.email_confirmed_at).getTime()
        : 0;

      // New user: created within 10 min (OAuth) or just confirmed email (within 2 min)
      const isNewUser =
        now - createdAt < 600_000 ||
        (confirmedAt > 0 && now - confirmedAt < 120_000);

      if (isNewUser) {
        return NextResponse.redirect(`${origin}/${locale}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/dashboard`);
}
