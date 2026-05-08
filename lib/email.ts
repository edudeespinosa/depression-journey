import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "Phantom Prophet <onboarding@resend.dev>";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendNudgeEmail({
  to,
  message,
  actionLabel,
  actionHref,
}: {
  to: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://phantomprophet.com";
  const ctaUrl = actionHref ? `${appUrl}/en${actionHref}` : `${appUrl}/en/dashboard`;
  const ctaLabel = actionLabel ?? "Open dashboard";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>A note from Phantom Prophet</title>
</head>
<body style="margin:0;padding:0;background:#FDFCF8;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFCF8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8e4;padding:40px 36px;">
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;color:#7C9082;text-transform:uppercase;">
                Phantom Prophet
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:#2D3B35;">
                ${message}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:36px;">
              <a href="${ctaUrl}"
                 style="display:inline-block;background:#3E4A3D;color:#ffffff;text-decoration:none;
                        font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                You're receiving this because you have email check-in reminders enabled.<br/>
                <a href="${appUrl}/en/settings" style="color:#7C9082;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const plainText = `${message}\n\n${ctaLabel}: ${ctaUrl}\n\n---\nYou're receiving this because you have email check-in reminders enabled.\nManage preferences: ${appUrl}/en/settings`;

  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: "A gentle nudge from Phantom Prophet",
    html,
    text: plainText,
    headers: {
      "List-Unsubscribe": `<${appUrl}/en/settings>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
