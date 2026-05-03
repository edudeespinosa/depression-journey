import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAgent } from "@/lib/agent-server";
import { sendNudgeEmail } from "@/lib/email";

// How many days without a check-in before we nudge
const INACTIVE_DAYS = 2;
// Minimum hours between nudges for the same user
const COOLDOWN_HOURS = 22;

export async function POST(req: NextRequest) {
  // Verify the request comes from our cron scheduler
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find users who haven't checked in for INACTIVE_DAYS and have email notifications on
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

  // Get all users with email_notifications enabled
  const { data: prefs, error: prefsErr } = await supabase
    .from("notification_preferences")
    .select("user_id, last_nudged_at")
    .eq("email_notifications", true);

  if (prefsErr) {
    console.error("[cron/nudge] prefs fetch error:", prefsErr);
    return NextResponse.json({ error: prefsErr.message }, { status: 500 });
  }
  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ nudged: 0, skipped: 0, message: "No users with notifications enabled" });
  }

  // Filter out users nudged within the cooldown window
  const cooldownCutoff = new Date();
  cooldownCutoff.setHours(cooldownCutoff.getHours() - COOLDOWN_HOURS);

  const eligiblePrefs = prefs.filter((p) => {
    if (!p.last_nudged_at) return true;
    return new Date(p.last_nudged_at) < cooldownCutoff;
  });

  if (eligiblePrefs.length === 0) {
    return NextResponse.json({ nudged: 0, skipped: prefs.length, message: "All users in cooldown" });
  }

  const userIds = eligiblePrefs.map((p) => p.user_id);

  // Find which of those users have been inactive (no check-in since cutoff)
  const { data: recentCheckins } = await supabase
    .from("daily_checkins")
    .select("user_id")
    .in("user_id", userIds)
    .gte("created_at", cutoff.toISOString());

  const activeUserIds = new Set(recentCheckins?.map((c) => c.user_id) ?? []);
  const inactivePrefs = eligiblePrefs.filter((p) => !activeUserIds.has(p.user_id));

  if (inactivePrefs.length === 0) {
    return NextResponse.json({ nudged: 0, skipped: prefs.length, message: "All eligible users are active" });
  }

  // Fetch emails for inactive users from auth.users via admin API
  const results = await Promise.allSettled(
    inactivePrefs.map(async (pref) => {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(pref.user_id);
      if (userErr || !userData.user?.email) {
        throw new Error(`No email for user ${pref.user_id}`);
      }

      const email = userData.user.email;

      // Run the agent for this user
      const suggestion = await runAgent(pref.user_id, supabase);

      // Send the nudge email
      await sendNudgeEmail({
        to: email,
        message: suggestion.message,
        actionLabel: suggestion.action_label,
        actionHref: suggestion.action_href,
      });

      // Update last_nudged_at
      await supabase
        .from("notification_preferences")
        .upsert({ user_id: pref.user_id, last_nudged_at: new Date().toISOString() });

      return email;
    })
  );

  const nudged = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason?.message ?? String(r.reason));
    console.error("[cron/nudge] some nudges failed:", errors);
  }

  return NextResponse.json({
    nudged,
    failed,
    skipped: prefs.length - inactivePrefs.length,
  });
}
