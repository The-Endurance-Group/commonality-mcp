// Ported from the reference repo (server/services/hubspot.ts). Create/find a
// contact and log a Commonality findings note. Credentials are passed in per
// call (each workspace stores its own HubSpot API key).

const BASE_URL = "https://api.hubapi.com";
const TIMEOUT_MS = 15_000;

async function hubspotFetch(apiKey: string, path: string, options: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body as any)?.message || `HubSpot API error ${res.status}`;
      throw new Error(msg);
    }
    return body;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") throw new Error("HubSpot request timed out");
    throw err;
  }
}

export async function findContact(apiKey: string, email?: string, name?: string): Promise<{ id: string } | null> {
  if (email) {
    const data = await hubspotFetch(apiKey, "/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
        properties: ["email", "firstname", "lastname"],
        limit: 1,
      }),
    });
    if (data.results?.length) return { id: data.results[0].id };
  }

  if (name) {
    const parts = name.trim().split(/\s+/);
    const firstname = parts[0] ?? "";
    const lastname = parts.slice(1).join(" ");
    if (firstname && lastname) {
      const data = await hubspotFetch(apiKey, "/crm/v3/objects/contacts/search", {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [{
            filters: [
              { propertyName: "firstname", operator: "EQ", value: firstname },
              { propertyName: "lastname", operator: "EQ", value: lastname },
            ],
          }],
          properties: ["firstname", "lastname", "email"],
          limit: 1,
        }),
      });
      if (data.results?.length) return { id: data.results[0].id };
    }
  }

  return null;
}

export async function createContact(
  apiKey: string,
  prospect: { name: string; email?: string; title?: string; company?: string; linkedinUrl?: string }
): Promise<{ id: string }> {
  const parts = prospect.name.trim().split(/\s+/);
  const properties: Record<string, string> = {
    firstname: parts[0] ?? prospect.name,
    lastname: parts.slice(1).join(" ") || "",
  };
  if (prospect.email) properties.email = prospect.email;
  if (prospect.title) properties.jobtitle = prospect.title;
  if (prospect.company) properties.company = prospect.company;
  if (prospect.linkedinUrl) properties.linkedinbio = prospect.linkedinUrl;

  const data = await hubspotFetch(apiKey, "/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  });
  return { id: data.id };
}

export async function addNoteToContact(apiKey: string, contactId: string, noteBody: string): Promise<void> {
  const note = await hubspotFetch(apiKey, "/crm/v3/objects/notes", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: Date.now().toString(),
      },
    }),
  });

  await hubspotFetch(apiKey, `/crm/v3/objects/notes/${note.id}/associations/contacts/${contactId}/note_to_contact`, {
    method: "PUT",
  });
}

export interface HubSpotPushOptions {
  prospect: { name: string; email?: string; title?: string; company?: string; linkedinUrl?: string };
  employeeName: string;
  commonalities: Array<{ type: string; value: string }>;
  strengthScore: number;
}

export async function pushToHubspot(apiKey: string, opts: HubSpotPushOptions): Promise<{ contactId: string; created: boolean }> {
  let contact = await findContact(apiKey, opts.prospect.email, opts.prospect.name);
  const created = !contact;
  if (!contact) {
    contact = await createContact(apiKey, opts.prospect);
  }

  const commonalityLines = opts.commonalities.map(c => {
    const label = c.type === "alma_mater" ? "School" : c.type === "company" ? "Company" : "Location";
    return `  ${label}: ${c.value}`;
  }).join("\n");

  const noteBody = [
    `Commonality findings — ${opts.prospect.name} introduced via ${opts.employeeName}`,
    `Shared connections:\n${commonalityLines || "  (none recorded)"}`,
    `Strength score: ${opts.strengthScore}`,
    `Source: Commonality`,
  ].join("\n");

  await addNoteToContact(apiKey, contact.id, noteBody);
  return { contactId: contact.id, created };
}
