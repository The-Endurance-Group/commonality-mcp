import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, checkQuota, quotaExceededMessage } from "../../auth/quota.js";
import { DEFAULT_POSTS_COUNT, MAX_POSTS_COUNT, getCompanyPosts, getProfilePosts } from "../../services/apify.js";
import { text } from "./_result.js";

interface Args {
  url: string;
  posts_count?: number;
}

// Standalone version of the recent-posts step analyze_prospect/analyze_company
// already do internally - useful when the user just wants someone's (or some
// company's) recent posts without a warm-path lookup first. Always costs 1
// credit, same as the posts step in those tools - posts change over time, so
// unlike a profile fetch this is never free on repeat.
export const get_linkedin_posts: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.url) return text("Please provide the LinkedIn profile or company URL.", true);

    const status = await checkQuota(ctx);
    if (!status.allowed) return text(quotaExceededMessage(status, ctx.plan, ctx.role), true);

    const isCompany = args.url.includes("linkedin.com/company/");
    const count = Math.min(Math.max(args.posts_count ?? DEFAULT_POSTS_COUNT, 1), MAX_POSTS_COUNT);

    let posts;
    try {
      posts = isCompany ? await getCompanyPosts(args.url, count) : await getProfilePosts(args.url, count);
    } catch {
      return text("Couldn't fetch recent posts right now. Please try again.", true);
    }
    await chargeCredit(ctx, "get_linkedin_posts", { target: args.url });

    if (!posts.length) return text(`No recent posts found for ${args.url}.`);

    const lines = posts.map((p, i) => `${i + 1}. ${p.postedAt ? `[${p.postedAt}] ` : ""}${p.text.slice(0, 200)}`);
    return text(`Recent posts for ${args.url}:\n${lines.join("\n")}`);
  },
};
