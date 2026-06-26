import type { ToolContext, ToolHandler } from "@commonality/shared";
import { getTeammateByEmail } from "../../db/queries.js";
import { sendTeammateHandoff } from "../../services/resend.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath } from "./_prospect.js";

interface Args { teammate_email: string; url: string; note?: string }

// Hand a prospect off to a teammate who has a stronger warm path.
export const send_to_teammate: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.teammate_email || !args.url) {
      return text("Provide both teammate_email and the prospect's url.", true);
    }
    const teammate = await getTeammateByEmail(ctx.company_id, args.teammate_email);
    if (!teammate) return text(`No teammate ${args.teammate_email} in your workspace.`, true);

    const { enriched, results } = await analyzeProspectUrl(args.url, ctx);
    const summary = `${enriched.name}${enriched.title ? `, ${enriched.title}` : ""}${enriched.company ? ` at ${enriched.company}` : ""}\n${args.url}${results[0] ? `\nWarm path: ${summarizePath(results[0])}` : ""}`;

    try {
      await sendTeammateHandoff(teammate.email, ctx.email, summary, args.note);
    } catch (err) {
      return text(`Couldn't email ${teammate.email}: ${err instanceof Error ? err.message : "send failed"}.`, true);
    }
    return text(`Sent ${enriched.name} to ${teammate.email}.`);
  },
};
