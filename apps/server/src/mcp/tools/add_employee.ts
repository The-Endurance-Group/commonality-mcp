import type { ToolContext, ToolHandler } from "@commonality/shared";
import { importRoster, TeamLimitError } from "../../services/roster.js";
import { text } from "./_result.js";

interface Args {
  linkedin_url?: string;
  name?: string;
}

// Add one teammate to the roster by LinkedIn URL - the single-person
// equivalent of the web app's bulk "Import team" flow. Reuses importRoster()
// so it respects the same free/pro team-member cap.
export const add_employee: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (ctx.role !== "admin") return text("Only workspace admins can add teammates to the roster.", true);
    if (!args.linkedin_url) return text("Provide the person's LinkedIn profile URL.", true);
    if (!/linkedin\.com\/in\//i.test(args.linkedin_url)) {
      return text(
        `"${args.linkedin_url}" doesn't look like a LinkedIn profile URL (should contain linkedin.com/in/...).`,
        true,
      );
    }

    try {
      const result = await importRoster(ctx.company_id, ctx.plan, { urls: [args.linkedin_url] });
      if (result.imported === 0) {
        if (result.trimmedByLimit) {
          return text(
            `Your ${ctx.plan} plan is already at its team member limit (${result.limit}). ` +
              (ctx.plan === "free" ? "Upgrade to Pro to add more." : "Contact us for a custom limit."),
            true,
          );
        }
        return text("That person is already on your team roster.");
      }
      return text(
        `Added ${args.name ?? "that person"} to your team roster. Enrichment (schools, employers, location) ` +
          "runs in the background and usually finishes within a minute or two.",
      );
    } catch (err) {
      if (err instanceof TeamLimitError) return text(err.message, true);
      return text("Couldn't add that person right now. Please try again.", true);
    }
  },
};
