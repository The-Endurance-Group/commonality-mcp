import { logger } from "../logger.js";

// TEG's own HubSpot (lead tracking for Commonality signups) - not to be
// confused with a future per-company CRM push using companies.hubspot_api_key.
// Uses HUBSPOT_API_KEY, a private app token with crm.objects.contacts.write scope.

const HUBSPOT_CONTACTS_UPSERT_URL = "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert";

/**
 * Create or update a HubSpot contact for a brand-new Commonality signup.
 * Best-effort, fire-and-forget from createWorkspace() - a failure here must
 * never block or fail the signup itself.
 */
export async function upsertHubspotContact(
  signupEmail: string,
  companyName: string,
): Promise<void> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    logger.warn({ signupEmail }, "HUBSPOT_API_KEY not set - contact not created");
    return;
  }
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
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot error ${res.status}: ${body}`);
  }
}
