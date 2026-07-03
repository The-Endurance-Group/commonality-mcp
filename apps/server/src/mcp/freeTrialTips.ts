import type { McpToolResult } from "@commonality/shared";

// Free-trial only: rotate through these after each charged call so users
// discover more of the product during their 50 free credits/month. Stops
// once plan is "pro" (callers gate on ctx.plan === "free").
const FREE_TRIAL_TIPS: string[] = [
  "Did you know I can also find your best way into a whole company, not just one person? Try asking \"what's my best way into [Company]?\"",
  "Did you know I can show your team's collective network - top schools, employers, and locations?",
  "Did you know uploading your LinkedIn connections gives you more warm paths to work with? Ask me how.",
];

// Admin only, since adding teammates to the roster is an admin-only action.
const FREE_TRIAL_TIPS_ADMIN: string[] = [
  "Did you know you can add a teammate to your roster right from here? Just say \"add [LinkedIn profile URL] to our team.\"",
];

export function appendFreeTrialTip(result: McpToolResult, usedCount: number, role: "admin" | "member"): McpToolResult {
  const tips = role === "admin" ? [...FREE_TRIAL_TIPS, ...FREE_TRIAL_TIPS_ADMIN] : FREE_TRIAL_TIPS;
  const tip = tips[(usedCount - 1) % tips.length];
  const content = result.content.map((c, i) =>
    i === result.content.length - 1 && c.type === "text" ? { ...c, text: `${c.text}\n\n💡 ${tip}` } : c,
  );
  return { ...result, content };
}
