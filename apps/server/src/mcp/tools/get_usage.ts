import type { ToolContext, ToolHandler } from "@commonality/shared";
import { checkQuota } from "../../auth/quota.js";
import { text } from "./_result.js";

// Report the workspace's current credit usage and plan. On-demand only - the
// one place a user can deliberately check their balance (tool calls
// themselves no longer proactively state remaining credits).
export const get_usage: ToolHandler<Record<string, never>> = {
  async run(_args, ctx: ToolContext) {
    const q = await checkQuota(ctx);
    return text(`Plan: ${ctx.plan}. Used ${q.used} of ${q.limit} credits this month. ${q.remaining} remaining.`);
  },
};
