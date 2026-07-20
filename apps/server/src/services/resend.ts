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

// Alerts config.newAccountNotifyEmail when a HubSpot contact upsert failed for
// a new signup, so it doesn't just silently vanish into the logs. Best-effort:
// a failure sending THIS alert must never throw back into the caller.
export async function sendHubspotFailureAlert(
  signupEmail: string,
  companyName: string,
  errorMessage: string,
): Promise<void> {
  const subject = `Commonality: HubSpot contact failed for ${companyName}`;
  const text = `A new Commonality signup didn't make it into HubSpot - check the integration.

Company: ${companyName}
Signed up with: ${signupEmail}
Error: ${errorMessage}`;
  await sendEmail(config.newAccountNotifyEmail, subject, text);
}

const CONOR_CALENDAR_URL = "https://meetings.hubspot.com/conor-sullivan/commonality";

// Welcome email to whoever just created a new workspace (the signup itself,
// not a teammate joining an existing one). Best-effort, fire-and-forget from
// createWorkspace() - a failure here must never block or fail the signup.
// Returns the sent subject/text so the caller can log it to HubSpot's
// contact timeline (Resend-sent mail doesn't show up there on its own).
export async function sendWelcomeEmail(signupEmail: string): Promise<{ subject: string; text: string }> {
  const subject = "Thanks for Signing Up for Commonality- Need Help Setting it Up?";
  const text = `Hi There!

Thanks for signing up for Commonality. My name is Conor Sullivan and I am one of its creators.

Please let me know if you need assistance signing up or using it within your AI. I'd be happy to help.

Here's my calendar: ${CONOR_CALENDAR_URL}

Or, if you prefer, let me know some times that work for you.

Best,
Conor`;
  await sendEmail(signupEmail, subject, text);
  return { subject, text };
}

// Sent to the admin when their company uses its first-ever credit -
// congratulating them on getting set up and using it. Best-effort,
// fire-and-forget from chargeCredit() - a failure here must never block or
// fail the credit charge itself. Returns the sent subject/text so the caller
// can log it to HubSpot's contact timeline.
export async function sendFirstCreditUsedEmail(email: string): Promise<{ subject: string; text: string }> {
  const subject = "Congrats on Using Commonality for the First Time!";
  const text = `Congrats on getting Commonality set up and using it for the first time!

Let me know if you have any questions or would like to chat.

Here's my calendar: ${CONOR_CALENDAR_URL}

Best,
Conor`;
  await sendEmail(email, subject, text);
  return { subject, text };
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
