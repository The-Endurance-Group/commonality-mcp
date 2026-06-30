import type { ToolContext, ToolHandler } from "@commonality/shared";
import { db } from "../../db/client.js";
import { insertLinkedinConnections } from "../../db/queries.js";
import { text } from "./_result.js";

interface Conn { name?: string; url?: string; connected_on?: string }
interface Args { employee_id?: string; employee_url?: string; connections: Conn[] }

// Store a team member's 1st-degree LinkedIn connections so they count as the
// strongest warm-path signal in analyze_prospect.
export const upload_connections: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!Array.isArray(args.connections) || args.connections.length === 0) {
      return text("Provide a non-empty connections array.", true);
    }

    // Resolve the owning employee within this workspace.
    let q = db().from("employees").select("id").eq("company_id", ctx.company_id);
    if (args.employee_id) q = q.eq("id", args.employee_id);
    else if (args.employee_url) q = q.eq("linkedin_url", args.employee_url);
    else return text("Provide employee_id or employee_url (whose connections these are).", true);

    const { data: emp } = await q.maybeSingle<{ id: string }>();
    if (!emp) return text("That team member isn't in your workspace roster.", true);

    try {
      const saved = await insertLinkedinConnections(ctx.company_id, emp.id, args.connections);
      if (!saved) return text("No connections had a name or url to store.", true);
      return text(`Saved ${saved} connections for that team member. They'll now surface as 1st-degree warm paths.`);
    } catch (err) {
      return text(`Couldn't save connections: ${err instanceof Error ? err.message : "unknown error"}`, true);
    }
  },
};
