// Ported from the reference repo (server/services/salesforce.ts). Create/find a
// Lead and log a completed Task with Commonality findings. Credentials are
// passed in per call (each workspace stores its own Connected App config).

const TIMEOUT_MS = 15_000;

// Cache tokens per client to avoid a fresh auth round-trip on every push.
// Salesforce tokens expire after ~1 hour; we refresh 2 minutes early.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(instanceUrl: string, clientId: string, clientSecret: string): Promise<string> {
  const cached = tokenCache.get(clientId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const desc = (body as any)?.error_description || (body as any)?.error || `HTTP ${res.status}`;
      throw new Error(`Salesforce authentication failed — ${desc}. Check your credentials in Integration settings.`);
    }
    const token = (body as any)?.access_token;
    if (!token) throw new Error("Salesforce returned no access token — check your Connected App configuration.");
    // Salesforce tokens last ~3600 s; cache for 3480 s (2 min early refresh).
    const ttl = ((body as any)?.expires_in ?? 3600) - 120;
    tokenCache.set(clientId, { token, expiresAt: Date.now() + ttl * 1000 });
    return token;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") throw new Error("Salesforce authentication timed out.");
    throw err;
  }
}

async function sfFetch(instanceUrl: string, accessToken: string, path: string, options: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${instanceUrl}/services/data/v57.0${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 204) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(body) ? body[0]?.message : (body as any)?.message;
      throw new Error(msg || `Salesforce API error ${res.status}`);
    }
    return body;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") throw new Error("Salesforce request timed out.");
    throw err;
  }
}

async function findLead(instanceUrl: string, accessToken: string, email?: string, name?: string): Promise<{ id: string } | null> {
  if (email) {
    const q = encodeURIComponent(`SELECT Id FROM Lead WHERE Email = '${email.replace(/'/g, "''")}'`);
    const data = await sfFetch(instanceUrl, accessToken, `/query?q=${q}`);
    if (data?.records?.length) return { id: data.records[0].Id };
  }

  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0] ?? "";
    const last = parts.slice(1).join(" ");
    if (first && last) {
      const q = encodeURIComponent(`SELECT Id FROM Lead WHERE FirstName = '${first.replace(/'/g, "''")}' AND LastName = '${last.replace(/'/g, "''")}'`);
      const data = await sfFetch(instanceUrl, accessToken, `/query?q=${q}`);
      if (data?.records?.length) return { id: data.records[0].Id };
    }
  }

  return null;
}

async function createLead(
  instanceUrl: string,
  accessToken: string,
  prospect: { name: string; email?: string; title?: string; company?: string; linkedinUrl?: string }
): Promise<{ id: string }> {
  const parts = prospect.name.trim().split(/\s+/);
  const body: Record<string, string> = {
    FirstName: parts[0] ?? prospect.name,
    LastName: parts.slice(1).join(" ") || prospect.name,
    Company: prospect.company || "Unknown",
  };
  if (prospect.email) body.Email = prospect.email;
  if (prospect.title) body.Title = prospect.title;
  if (prospect.linkedinUrl) body.Website = prospect.linkedinUrl;

  const data = await sfFetch(instanceUrl, accessToken, "/sobjects/Lead", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { id: data.id };
}

async function addTaskToLead(instanceUrl: string, accessToken: string, leadId: string, taskBody: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  await sfFetch(instanceUrl, accessToken, "/sobjects/Task", {
    method: "POST",
    body: JSON.stringify({
      Subject: "Commonality findings",
      Description: taskBody,
      WhoId: leadId,
      Status: "Completed",
      ActivityDate: today,
    }),
  });
}

export interface SalesforcePushOptions {
  prospect: { name: string; email?: string; title?: string; company?: string; linkedinUrl?: string };
  employeeName: string;
  commonalities: Array<{ type: string; value: string }>;
  strengthScore: number;
}

export async function pushToSalesforce(
  instanceUrl: string,
  clientId: string,
  clientSecret: string,
  opts: SalesforcePushOptions
): Promise<{ leadId: string; created: boolean }> {
  const accessToken = await getAccessToken(instanceUrl, clientId, clientSecret);
  let lead = await findLead(instanceUrl, accessToken, opts.prospect.email, opts.prospect.name);
  const created = !lead;
  if (!lead) {
    lead = await createLead(instanceUrl, accessToken, opts.prospect);
  }

  const commonalityLines = opts.commonalities.map(c => {
    const label = c.type === "alma_mater" ? "School" : c.type === "company" ? "Company" : c.type === "linkedin_connection" ? "Direct connection" : "Location";
    return `  ${label}: ${c.value}`;
  }).join("\n");

  const taskBody = [
    `Commonality findings — ${opts.prospect.name} introduced via ${opts.employeeName}`,
    `Shared connections:\n${commonalityLines || "  (none recorded)"}`,
    `Strength score: ${opts.strengthScore}`,
    `Source: Commonality`,
  ].join("\n");

  await addTaskToLead(instanceUrl, accessToken, lead.id, taskBody);
  return { leadId: lead.id, created };
}
