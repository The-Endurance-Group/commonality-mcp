import { Router, type Router as RouterType } from "express";
import { logger } from "../logger.js";
import { logHubspotEmailEngagement, upsertHubspotLead } from "../services/hubspot.js";
import { sendLearnMoreEmail, sendNewLeadNotification } from "../services/resend.js";

// Public (no auth) - the marketing site's "Learn more" lead form. A lighter
// CTA than signing up: just a name + email, no account/workspace created.
// Does the same lead-tracking side effects as a real signup (HubSpot contact
// upsert, a follow-up email logged to its timeline, a heads-up notification)
// without touching the product's own users/companies tables at all.
export const leadsRouter: RouterType = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

leadsRouter.post("/", async (req, res) => {
  const { name, email } = (req.body ?? {}) as { name?: string; email?: string };
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedName) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
    res.status(400).json({ error: "a valid email is required" });
    return;
  }

  // Best-effort, fire-and-forget, mirroring createWorkspace()'s pattern - a
  // failure in any of these must never fail the lead submission itself.
  sendNewLeadNotification(trimmedName, trimmedEmail).catch((err) =>
    logger.error({ err, name: trimmedName, email: trimmedEmail }, "new-lead notification failed"),
  );
  (async () => {
    let contactId: string | undefined;
    try {
      contactId = await upsertHubspotLead(trimmedEmail, trimmedName);
    } catch (err) {
      logger.error({ err, name: trimmedName, email: trimmedEmail }, "hubspot lead upsert failed");
    }
    let sent: { subject: string; text: string } | undefined;
    try {
      sent = await sendLearnMoreEmail(trimmedEmail);
    } catch (err) {
      logger.error({ err, email: trimmedEmail }, "learn-more email failed");
    }
    if (contactId && sent) {
      try {
        await logHubspotEmailEngagement(contactId, trimmedEmail, sent.subject, sent.text);
      } catch (err) {
        logger.error({ err, email: trimmedEmail, contactId }, "hubspot email-engagement logging failed");
      }
    }
  })();

  res.status(201).json({ ok: true });
});
