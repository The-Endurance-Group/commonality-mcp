import { config } from "../config.js";
import { logger } from "../logger.js";

// Minimal Resend client. NEW (not in the reference repo). Sends invite emails.

const RESEND_API = "https://api.resend.com/emails";

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ to, subject }, "RESEND_API_KEY not set - email not sent");
    return;
  }
  const from = process.env.RESEND_FROM_EMAIL ?? "invites@commonality.co";
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

// New workspace signup - not a teammate joining an existing one. Notifies
// config.newAccountNotifyEmail (defaults to csullivan@theendurancegroup.com).
// Best-effort: called fire-and-forget from createWorkspace(), a failure here
// must never block or fail the signup itself.
export async function sendNewAccountNotification(
  signupEmail: string,
  companyName: string,
  domain: string | null,
): Promise<void> {
  const subject = `New Commonality signup: ${companyName}`;
  const text = `A new company workspace was just created on Commonality.

Company: ${companyName}
Domain: ${domain ?? "(none)"}
Signed up with: ${signupEmail}`;
  await sendEmail(config.newAccountNotifyEmail, subject, text);
}

export async function sendInviteEmail(
  email: string,
  companyName: string,
  inviterName: string,
): Promise<void> {
  const appUrl = config.publicBaseUrl.replace(/\/$/, "");
  const subject = `${inviterName} invited you to ${companyName} on Commonality`;
  const text = `${inviterName} has invited you to join the ${companyName} workspace on Commonality.

Sign in with this email address to get started:
${appUrl}

Once you're in, you'll find setup instructions on the dashboard.`;
  await sendEmail(email, subject, text);
}
