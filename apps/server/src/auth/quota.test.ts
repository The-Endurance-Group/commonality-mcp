import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal fake of the two tables checkQuota reads.
let creditsUsed = 0;
let companyRow: { unlimited_credits?: boolean } | null = null;

vi.mock("../db/client.js", () => ({
  db: () => ({
    from: (table: string) => {
      const b: any = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () =>
          table === "monthly_usage" ? { data: { credits_used: creditsUsed } } : { data: companyRow },
      };
      return b;
    },
  }),
}));
vi.mock("../services/hubspot.js", () => ({ logHubspotEmailEngagement: vi.fn(), markCreditUsed: vi.fn() }));
vi.mock("../services/resend.js", () => ({ sendFirstCreditUsedEmail: vi.fn() }));

const { checkQuota, usageThresholdNotice } = await import("./quota.js");
const ctx = { company_id: "c1", plan: "pro" as const };

describe("checkQuota unlimited override", () => {
  beforeEach(() => {
    creditsUsed = 200;
    companyRow = null;
  });

  it("blocks a normal pro company at 200/200", async () => {
    companyRow = { unlimited_credits: false };
    const q = await checkQuota(ctx);
    expect(q).toMatchObject({ allowed: false, limit: 200, unlimited: false });
  });

  it("allows past the plan limit when unlimited_credits is set, still reporting usage", async () => {
    companyRow = { unlimited_credits: true };
    creditsUsed = 5000;
    const q = await checkQuota(ctx);
    expect(q).toMatchObject({ allowed: true, used: 5000, unlimited: true });
  });

  it("falls back to plan enforcement if the company lookup returns nothing", async () => {
    companyRow = null;
    expect((await checkQuota(ctx)).allowed).toBe(false);
  });

  it("never emits a usage threshold notice for unlimited (limit 0)", () => {
    expect(usageThresholdNotice(100, 300, 0, "pro", "admin")).toBeNull();
  });
});
