import type { ToolContext, ToolHandler } from "@commonality/shared";
import { db } from "../../db/client.js";
import { getCompany } from "../../db/queries.js";
import { sendInviteEmail } from "../../services/resend.js";
import { text } from "./_result.js";

interface Args { email: string }

// Invite a teammate to the workspace (admin only). Creates an invite row and
// emails setup instructions.
export const invite_member: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (ctx.role !== "admin") return text("Only workspace admins can invite members.", true);
    const email = (args.email ?? "").toLowerCase().trim();
    if (!email || !email.includes("@")) return text("Provide a valid email address.", true);

    const company = await getCompany(ctx.company_id);
    if (!company) return text("Workspace not found.", true);

    const { error } = await db().from("invites").insert({
      company_id: ctx.company_id,
      email,
      invited_by: ctx.user_id,
      accepted: false,
    });
    if (error) return text(`Couldn't create invite: ${error.message}`, true);

    try {
      await sendInviteEmail(email, company.name, ctx.email);
    } catch (err) {
      return text(`Invite recorded, but the email failed to send: ${err instanceof Error ? err.message : "unknown"}. They can still join with this email.`);
    }
    return text(`Invited ${email} to ${company.name}. They'll get setup instructions by email.`);
  },
};
