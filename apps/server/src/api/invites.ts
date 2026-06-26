import { Router, type Router as RouterType } from "express";
import { db } from "../db/client.js";
import { getCompany } from "../db/queries.js";
import { sendInviteEmail } from "../services/resend.js";

export const invitesRouter: RouterType = Router();

// GET /api/invites — pending + accepted invites for the workspace.
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

// POST /api/invites — admins invite a teammate (creates row + emails them).
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
