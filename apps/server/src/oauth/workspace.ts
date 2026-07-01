import { db } from "../db/client.js";
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

export async function resolveWorkspaceForEmail(rawEmail: string): Promise<SignableClaims> {
  const supa = db();
  const email = rawEmail.toLowerCase().trim();

  // 1. Already a member of a workspace.
  const { data: existingUser } = await supa
    .from("users")
    .select("id, company_id, role")
    .eq("email", email)
    .maybeSingle<UserRow>();
  if (existingUser) {
    const company = await getCompany(existingUser.company_id);
    return toClaims(existingUser, company, email);
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
    return toClaims(user, company, email);
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
      return toClaims(user, company, email);
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
  return toClaims(user, company, email);
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
