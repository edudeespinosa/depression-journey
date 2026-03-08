export async function register() {
  // Only run in Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET ?? "";

  async function sendNotifications() {
    try {
      await fetch(`${appUrl}/api/push/send`, {
        method: "POST",
        headers: { "x-cron-secret": secret },
      });
    } catch {
      // Server may not be fully up yet — ignore
    }
  }

  // Fire at the top of every hour
  const now = new Date();
  const msUntilNextHour =
    (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();

  // Wait until the next top-of-hour, then repeat every hour
  setTimeout(() => {
    sendNotifications();
    setInterval(sendNotifications, 60 * 60 * 1000);
  }, msUntilNextHour);
}
