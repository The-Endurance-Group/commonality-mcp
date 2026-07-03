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

export async function sendInviteEmail(
  email: string,
  companyName: string,
  inviterName: string,
): Promise<void> {
  const mcpUrl = `${config.publicBaseUrl.replace(/\/$/, "").replace(/^https?:\/\//, "")}/mcp`;
  const subject = `Join ${companyName} on Commonality`;
  const text = `${inviterName} has invited you to join the ${companyName} workspace on Commonality.

To get started:
1. Open Claude → Settings → Connectors → Add custom connector
2. Paste this URL: ${mcpUrl}
3. Sign in with this email (${email}) when prompted

The full team roster is already set up - you'll have access immediately.`;
  await sendEmail(email, subject, text);
}
