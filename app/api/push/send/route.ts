import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { safeDecrypt } from "@/lib/encryption";
// @ts-expect-error — web-push types installed separately
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(req: NextRequest) {
  // Protect with a shared secret so only cron jobs can trigger this
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const force = req.nextUrl.searchParams.get("force") === "true";
  const nowUtc = new Date();
  const nowHour = `${String(nowUtc.getUTCHours()).padStart(2, "0")}:${String(nowUtc.getUTCMinutes()).padStart(2, "0")}`;
  // Match on hour only — fires for any subscription within the current UTC hour
  const nowHourOnly = nowHour.slice(0, 2);

  // Get subscriptions — bypass time filter when force=true
  let query = admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth_key, notification_time");
  if (!force) query = query.like("notification_time", `${nowHourOnly}:%`);
  const { data: subs } = await query;

  if (!subs?.length) return NextResponse.json({ sent: 0, reason: force ? "no subscriptions" : `no subscriptions at ${nowHourOnly}:xx UTC` });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      // Pick a random active affirmation for this user
      const { data: affirmations } = await admin
        .from("affirmations")
        .select("text")
        .eq("user_id", sub.user_id)
        .eq("is_active", true);

      if (!affirmations?.length) return;
      const pick = affirmations[Math.floor(Math.random() * affirmations.length)];
      const text = safeDecrypt(pick.text) ?? "You are becoming stronger every day.";

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title: "Your affirmation", body: text }),
        );
        sent++;
      } catch {
        // Subscription expired — remove it
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    })
  );

  return NextResponse.json({ sent });
}
