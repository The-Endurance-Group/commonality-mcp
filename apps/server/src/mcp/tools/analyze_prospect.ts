import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, checkQuota, isProspectUnlocked, quotaExceededMessage } from "../../auth/quota.js";
import { getProfilePosts } from "../../services/apify.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath } from "./_prospect.js";

interface Args {
  url: string;
  include_posts?: boolean;
}

// Find warm paths from the team to a prospect. Returns a ranked, token-lean
// summary - full enrichment stays in Supabase. 1 credit per (company, URL) -
// this is one Cassidy enrichment call, and re-analysing the same prospect is
// free. Pre-checks quota to skip the vendor call when clearly over limit
// (already-unlocked prospects stay free regardless), but only actually
// charges after the call succeeds - a failed Cassidy call must never cost a
// credit. Never state credit cost/usage in the response unless the user
// explicitly asks (that's what get_usage is for) - recent posts are opt-in
// only, fetched solely when include_posts is set on a follow-up call.
export const analyze_prospect: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.url) return text("Please provide the prospect's LinkedIn URL.", true);

    const alreadyUnlocked = await isProspectUnlocked(ctx.company_id, args.url);
    if (!alreadyUnlocked) {
      const status = await checkQuota(ctx);
      if (!status.allowed) return text(quotaExceededMessage(status, ctx.plan, ctx.role), true);
    }

    let enriched, results;
    try {
      ({ enriched, results } = await analyzeProspectUrl(args.url, ctx));
    } catch {
      return text("Couldn't analyze that prospect right now. Please try again.", true);
    }
    await chargeCredit(ctx, args.url);

    const header = `${enriched.name}${enriched.title ? `, ${enriched.title}` : ""}${enriched.company ? ` at ${enriched.company}` : ""}\n${args.url}`;

    // Recent posts - a personalization signal, not part of warm-path scoring.
    // Opt-in only: ask the user first, only fetch if they said yes. Own
    // credit each time (posts change over time, unlike the warm path itself,
    // so this isn't a permanent per-prospect unlock).
    let activityNote = "";
    let askAboutPosts = "";
    if (args.include_posts) {
      const postsStatus = await checkQuota(ctx);
      if (postsStatus.allowed) {
        try {
          const posts = await getProfilePosts(args.url, 3);
          if (posts.length) {
            await chargeCredit(ctx);
            const postLines = posts.map((p, i) => `${i + 1}. ${p.postedAt ? `[${p.postedAt}] ` : ""}${p.text.slice(0, 200)}`);
            activityNote = `\n\nRecent posts:\n${postLines.join("\n")}`;
          }
        } catch {
          // no posts available - not worth failing the whole result over
        }
      }
    } else {
      askAboutPosts = "\n\nAsk the user if they'd like this person's recent LinkedIn posts too - only fetch them " +
        "(call analyze_prospect again with the same url + include_posts:true) if they say yes.";
    }

    if (results.length === 0) {
      return text(`${header}\n\nNo warm paths found on your team yet.${activityNote}${askAboutPosts}`);
    }

    const top = results.slice(0, 5).map((r, i) => `${i + 1}. ${summarizePath(r)}`).join("\n");
    return text(`${header}\n\nTop warm paths:\n${top}${activityNote}${askAboutPosts}`);
  },
};
