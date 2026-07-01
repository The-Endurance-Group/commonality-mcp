import type { ToolContext, ToolHandler } from "@commonality/shared";
import { computeSocialCapital, type CountItem } from "../../services/analysis.js";
import { getCompany, getCompanyEmployees } from "../../db/queries.js";
import { text } from "./_result.js";

// A token-lean snapshot of the team's collective network: top schools,
// past employers, and locations.
export const social_capital_dashboard: ToolHandler<Record<string, never>> = {
  async run(_args, ctx: ToolContext) {
    const [company, employees] = await Promise.all([
      getCompany(ctx.company_id),
      getCompanyEmployees(ctx.company_id),
    ]);
    if (!employees.length) return text("No team members imported yet. Set up your roster in onboarding first.");

    const sc = computeSocialCapital(employees, company?.name);
    const top = (items: CountItem[]) =>
      items.slice(0, 5).map((i) => `${i.label} (${i.count})`).join(", ") || "-";

    return text(
      `Social capital - ${sc.totalEmployees} team members\n\n` +
        `Top schools: ${top(sc.schools)}\n` +
        `Top past employers: ${top(sc.pastCompanies)}\n` +
        `Top locations: ${top(sc.locations)}\n` +
        (sc.avgConnections ? `Avg LinkedIn connections: ${sc.avgConnections}` : ""),
    );
  },
};
