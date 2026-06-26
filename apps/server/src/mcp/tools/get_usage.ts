import type { ToolContext, ToolHandler } from "@commonality/shared";
import { checkQuota } from "../../auth/quota.js";
import { text } from "./_result.js";

// Report the workspace's current search usage and plan.
export const get_usage: ToolHandler<Record<string, never>> = {
  async run(_args, ctx: ToolContext) {
    const q = await checkQuota(ctx);
    const scope = ctx.plan === "free" ? "lifetime" : "this month";
    return text(
      `Plan: ${ctx.plan}. Used ${q.used} of ${q.limit} searches (${scope}). ${q.remaining} remaining.`,
    );
  },
};
