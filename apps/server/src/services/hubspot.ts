import { logger } from "../logger.js";

// TEG's own HubSpot (lead tracking for Commonality signups) - not to be
// confused with a future per-company CRM push using companies.hubspot_api_key.
// Uses HUBSPOT_API_KEY, a private app token with crm.objects.contacts.write scope.

const HUBSPOT_CONTACTS_UPSERT_URL = "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert";
const HUBSPOT_EMAILS_URL = "https://api.hubapi.com/crm/v3/objects/emails";

// Default HubSpot association type ID for "Email to Contact" (HubSpot-defined,
// not a custom one - same value across all portals).
const EMAIL_TO_CONTACT_ASSOCIATION_TYPE_ID = 198;

// Owner ID for csullivan@theendurancegroup.com in TEG's HubSpot - looked up
// via the Owners API (contact ownership needs the numeric ID, not the email).
const DEFAULT_OWNER_ID = "81355081";

function requireApiKey(signupEmail: string): string | undefined {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) logger.warn({ signupEmail }, "HUBSPOT_API_KEY not set - skipping HubSpot call");
  return apiKey;
}

/**
 * Create or update a HubSpot contact for a brand-new Commonality signup.
 * Best-effort, fire-and-forget from createWorkspace() - a failure here must
 * never block or fail the signup itself. Returns the contact's HubSpot
 * record ID (needed to log the welcome email to its timeline), or undefined
 * if HUBSPOT_API_KEY isn't set.
 */
export async function upsertHubspotContact(
  signupEmail: string,
  companyName: string,
  firstName?: string,
  lastName?: string,
): Promise<string | undefined> {
  const apiKey = requireApiKey(signupEmail);
  if (!apiKey) return undefined;
  const res = await fetch(HUBSPOT_CONTACTS_UPSERT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [
        {
          idProperty: "email",
          id: signupEmail,
          properties: {
            email: signupEmail,
            company: companyName,
            lifecyclestage: "lead",
            lead_source: "Commonality Sign Up",
            hubspot_owner_id: DEFAULT_OWNER_ID,
            ...(firstName ? { firstname: firstName } : {}),
            ...(lastName ? { lastname: lastName } : {}),
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { results?: { id: string }[] };
  return data.results?.[0]?.id;
}

/**
 * Set a single "Yes"-dropdown property on the admin's HubSpot contact by
 * email. Best-effort, fire-and-forget - updates the existing contact,
 * doesn't create a new one.
 */
async function setContactYesFlag(adminEmail: string, property: string): Promise<void> {
  const apiKey = requireApiKey(adminEmail);
  if (!apiKey) return;
  const res = await fetch(HUBSPOT_CONTACTS_UPSERT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [
        {
          idProperty: "email",
          id: adminEmail,
          properties: { [property]: "Yes" },
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot error ${res.status}: ${body}`);
  }
}

/**
 * Mark the admin's HubSpot contact as having brought on an additional
 * Commonality user (teammate accepted an invite or auto-joined by domain).
 */
export async function markAdditionalUserAdded(adminEmail: string): Promise<void> {
  await setContactYesFlag(adminEmail, "additional_commonality_user_added");
}

/** Mark the admin's HubSpot contact as having used their first Commonality credit. */
export async function markCreditUsed(adminEmail: string): Promise<void> {
  await setContactYesFlag(adminEmail, "commonality_credit_used");
}

/**
 * Log a sent email onto a HubSpot contact's timeline as an "Email" engagement.
 * Resend-sent mail doesn't appear in HubSpot on its own - this makes it show
 * up the same way a HubSpot-sent email would. Best-effort, fire-and-forget.
 */
export async function logHubspotEmailEngagement(
  contactId: string,
  signupEmail: string,
  subject: string,
  text: string,
): Promise<void> {
  const apiKey = requireApiKey(signupEmail);
  if (!apiKey) return;
  const res = await fetch(HUBSPOT_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_email_direction: "EMAIL",
        hs_email_status: "SENT",
        hs_email_subject: subject,
        hs_email_text: text,
      },
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: EMAIL_TO_CONTACT_ASSOCIATION_TYPE_ID }],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot email-log error ${res.status}: ${body}`);
  }
}
