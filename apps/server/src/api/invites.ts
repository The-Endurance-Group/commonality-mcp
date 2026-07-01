import { Router, type Router as RouterType } from "express";
import { db } from "../db/client.js";
import { getCompany } from "../db/queries.js";
import { sendInviteEmail } from "../services/resend.js";

export const invitesRouter: RouterType = Router();

// GET /api/invites - pending + accepted invites for the workspace.
invitesRouter.get("/", async (req, res) => {
  const { data, error } = await db()
    .from("invites")
    .select("id, email, accepted, expires_at, created_at")
    .eq("company_id", req.user!.company_id)
    .order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ invites: data ?? [] });
});

// POST /api/invites - admins invite a teammate (creates row + emails them).
invitesRouter.post("/", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const email = String((req.body ?? {}).email ?? "").toLowerCase().trim();
  if (!email.includes("@")) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  const company = await getCompany(user.company_id);
  if (!company) {
    res.status(404).json({ error: "company_not_found" });
    return;
  }
  const { data, error } = await db()
    .from("invites")
    .insert({ company_id: user.company_id, email, invited_by: user.user_id, accepted: false })
    .select("id, email, accepted, expires_at, created_at")
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  try {
    await sendInviteEmail(email, company.name, user.email);
  } catch {
    // Invite row exists; surface a soft warning but still 201.
    res.status(201).json({ invite: data, emailSent: false });
    return;
  }
  res.status(201).json({ invite: data, emailSent: true });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BULK = 50;

interface BulkResult {
  email: string;
  status: "invited" | "skipped" | "invalid";
  emailSent?: boolean;
}

// POST /api/invites/bulk - admins invite up to 50 teammates at once.
// Skips emails that are already members or already have a pending invite.
invitesRouter.post("/bulk", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const raw = (req.body ?? {}).emails;
  if (!Array.isArray(raw)) {
    res.status(400).json({ error: "emails_array_required" });
    return;
  }
  const emails = Array.from(
    new Set(raw.map((e) => String(e).toLowerCase().trim()).filter(Boolean)),
  );
  if (emails.length === 0) {
    res.status(400).json({ error: "no_emails" });
    return;
  }
  if (emails.length > MAX_BULK) {
    res.status(400).json({ error: "too_many", message: `Max ${MAX_BULK} emails at a time.` });
    return;
  }

  const company = await getCompany(user.company_id);
  if (!company) {
    res.status(404).json({ error: "company_not_found" });
    return;
  }

  // Existing members + pending invites for this company → skip duplicates.
  const [membersRes, pendingRes] = await Promise.all([
    db().from("users").select("email").eq("company_id", user.company_id),
    db().from("invites").select("email").eq("company_id", user.company_id).eq("accepted", false),
  ]);
  const taken = new Set<string>([
    ...((membersRes.data as { email: string }[] | null) ?? []).map((m) => m.email.toLowerCase()),
    ...((pendingRes.data as { email: string }[] | null) ?? []).map((i) => i.email.toLowerCase()),
  ]);

  const results: BulkResult[] = [];
  const toInvite: string[] = [];
  for (const email of emails) {
    if (!EMAIL_RE.test(email)) results.push({ email, status: "invalid" });
    else if (taken.has(email)) results.push({ email, status: "skipped" });
    else toInvite.push(email);
  }

  if (toInvite.length) {
    const rows = toInvite.map((email) => ({
      company_id: user.company_id,
      email,
      invited_by: user.user_id,
      accepted: false,
    }));
    const { error } = await db().from("invites").insert(rows);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    // Best-effort emails - the invite row stands even if delivery fails.
    await Promise.all(
      toInvite.map(async (email) => {
        let emailSent = true;
        try {
          await sendInviteEmail(email, company.name, user.email);
        } catch {
          emailSent = false;
        }
        results.push({ email, status: "invited", emailSent });
      }),
    );
  }

  const summary = {
    invited: results.filter((r) => r.status === "invited").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    invalid: results.filter((r) => r.status === "invalid").length,
  };
  res.status(201).json({ results, summary });
});
