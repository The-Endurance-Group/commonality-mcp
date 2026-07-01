import { Router, type Router as RouterType } from "express";
import { db } from "../db/client.js";

export const usersRouter: RouterType = Router();

// DELETE /api/users/me - a user removes themselves from the workspace
// entirely (their own account, not the team roster). Self-service, no admin
// gate needed since it only ever acts on the caller's own row.
usersRouter.delete("/me", async (req, res) => {
  const user = req.user!;
  const { error, count } = await db()
    .from("users")
    .delete({ count: "exact" })
    .eq("id", user.user_id)
    .eq("company_id", user.company_id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!count) {
    res.status(404).json({ error: "account_not_found" });
    return;
  }
  res.json({ ok: true });
});
