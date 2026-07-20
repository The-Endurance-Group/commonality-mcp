import { db } from "../db/client.js";
import { logHubspotEmailEngagement, markAdditionalUserAdded, upsertHubspotContact } from "../services/hubspot.js";
import { logger } from "../logger.js";
import { sendHubspotFailureAlert, sendNewAccountNotification, sendWelcomeEmail } from "../services/resend.js";
import type { SignableClaims } from "./jwt.js";

// Workspace resolution: given an authenticated email, figure out which company
// the user belongs to and mint their claims. Order: existing user → pending
// invite → company domain match → reject.

export class WorkspaceResolutionError extends Error {}

interface CompanyRow {
  id: string;
  plan: "free" | "pro";
}
interface UserRow {
  id: string;
  company_id: string;
  role: "admin" | "member";
}

/** Shown once, right after a user is auto-joined to a workspace they didn't create. */
export interface JoinedExistingCompany {
  companyName: string;
  adminEmail: string;
}

export interface WorkspaceResolution {
  claims: SignableClaims;
  joinedExistingCompany?: JoinedExistingCompany;
}

function toClaims(user: UserRow, company: CompanyRow, email: string): SignableClaims {
  return {
    sub: user.id,
    user_id: user.id,
    company_id: company.id,
    role: user.role,
    plan: company.plan,
    email,
  };
}

async function describeJoinedCompany(companyId: string): Promise<JoinedExistingCompany> {
  const supa = db();
  const [{ data: company }, { data: admin }] = await Promise.all([
    supa.from("companies").select("name").eq("id", companyId).maybeSingle<{ name: string }>(),
    supa
      .from("users")
      .select("email")
      .eq("company_id", companyId)
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ email: string }>(),
  ]);
  return { companyName: company?.name ?? "your company", adminEmail: admin?.email ?? "your admin" };
}

export async function resolveWorkspaceForEmail(rawEmail: string): Promise<WorkspaceResolution> {
  const supa = db();
  const email = rawEmail.toLowerCase().trim();

  // 1. Already a member of a workspace - normal returning login, no notice.
  const { data: existingUser } = await supa
    .from("users")
    .select("id, company_id, role")
    .eq("email", email)
    .maybeSingle<UserRow>();
  if (existingUser) {
    const company = await getCompany(existingUser.company_id);
    return { claims: toClaims(existingUser, company, email) };
  }

  // 2. Has a pending, unexpired invite - accept it and join that workspace.
  const nowIso = new Date().toISOString();
  const { data: invite } = await supa
    .from("invites")
    .select("id, company_id")
    .eq("email", email)
    .eq("accepted", false)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .maybeSingle<{ id: string; company_id: string }>();
  if (invite) {
    const user = await createUser(invite.company_id, email, "member");
    await supa.from("invites").update({ accepted: true }).eq("id", invite.id);
    const company = await getCompany(invite.company_id);
    const joinedExistingCompany = await describeJoinedCompany(company.id);
    markAdditionalUserAdded(joinedExistingCompany.adminEmail).catch((err) =>
      logger.error({ err, email, adminEmail: joinedExistingCompany.adminEmail }, "hubspot additional-user update failed"),
    );
    return { claims: toClaims(user, company, email), joinedExistingCompany };
  }

  // 3. Email domain matches a company that allows domain auto-join.
  const domain = email.split("@")[1];
  if (domain) {
    const { data: company } = await supa
      .from("companies")
      .select("id, plan")
      .eq("domain", domain)
      .maybeSingle<CompanyRow>();
    if (company) {
      const user = await createUser(company.id, email, "member");
      const joinedExistingCompany = await describeJoinedCompany(company.id);
      markAdditionalUserAdded(joinedExistingCompany.adminEmail).catch((err) =>
        logger.error({ err, email, adminEmail: joinedExistingCompany.adminEmail }, "hubspot additional-user update failed"),
      );
      return { claims: toClaims(user, company, email), joinedExistingCompany };
    }
  }

  throw new WorkspaceResolutionError(
    "No workspace found for this email. Ask your admin to invite you.",
  );
}

/**
 * Create a brand-new workspace with this email as its admin (onboarding).
 * Rejects if the email already belongs to a workspace.
 */
export async function createWorkspace(
  rawEmail: string,
  companyName: string,
  domain?: string,
  firstName?: string,
  lastName?: string,
): Promise<SignableClaims> {
  const email = rawEmail.toLowerCase().trim();
  const { data: existing } = await db().from("users").select("id").eq("email", email).maybeSingle();
  if (existing) throw new WorkspaceResolutionError("You already belong to a workspace.");

  const { data: company, error } = await db()
    .from("companies")
    .insert({ name: companyName, domain: domain?.toLowerCase().trim() || null, plan: "free" })
    .select("id, plan")
    .single<CompanyRow>();
  if (error || !company) {
    throw new WorkspaceResolutionError(`Could not create workspace: ${error?.message ?? "unknown"}`);
  }
  const user = await createUser(company.id, email, "admin");

  // Best-effort - a notification failure must never fail the signup itself.
  sendNewAccountNotification(email, companyName, domain?.toLowerCase().trim() || null).catch((err) =>
    logger.error({ err, email, companyName }, "new-account notification failed"),
  );
  (async () => {
    let contactId: string | undefined;
    try {
      contactId = await upsertHubspotContact(email, companyName, firstName, lastName);
    } catch (err) {
      logger.error({ err, email, companyName }, "hubspot contact upsert failed");
      sendHubspotFailureAlert(email, companyName, err instanceof Error ? err.message : String(err)).catch(
        (alertErr) => logger.error({ err: alertErr, email, companyName }, "hubspot failure alert email failed"),
      );
    }
    let sent: { subject: string; text: string } | undefined;
    try {
      sent = await sendWelcomeEmail(email);
    } catch (err) {
      logger.error({ err, email }, "welcome email failed");
    }
    if (contactId && sent) {
      try {
        await logHubspotEmailEngagement(contactId, email, sent.subject, sent.text);
      } catch (err) {
        logger.error({ err, email, contactId }, "hubspot email-engagement logging failed");
      }
    }
  })();

  return toClaims(user, company, email);
}

/**
 * Re-derive claims for a user from the database's current state - used on
 * refresh-token grants so a plan/role change (e.g. a superadmin upgrade)
 * takes effect on the next silent refresh instead of staying stuck with
 * whatever was true back when the refresh token was first issued.
 */
export async function refreshClaimsForUser(userId: string): Promise<SignableClaims> {
  const { data: user, error } = await db()
    .from("users")
    .select("id, company_id, role, email")
    .eq("id", userId)
    .single<UserRow & { email: string }>();
  if (error || !user) throw new WorkspaceResolutionError("User not found.");
  const company = await getCompany(user.company_id);
  return toClaims(user, company, user.email);
}

async function getCompany(companyId: string): Promise<CompanyRow> {
  const { data, error } = await db()
    .from("companies")
    .select("id, plan")
    .eq("id", companyId)
    .single<CompanyRow>();
  if (error || !data) throw new WorkspaceResolutionError("Workspace not found.");
  return data;
}

async function createUser(
  companyId: string,
  email: string,
  role: "admin" | "member",
): Promise<UserRow> {
  const { data, error } = await db()
    .from("users")
    .insert({ company_id: companyId, email, role })
    .select("id, company_id, role")
    .single<UserRow>();
  if (error || !data) {
    throw new WorkspaceResolutionError(`Could not create user: ${error?.message ?? "unknown"}`);
  }
  return data;
}
