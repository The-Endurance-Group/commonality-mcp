import type { ToolContext, ToolHandler } from "@commonality/shared";
import { db } from "../../db/client.js";
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

    const rows = args.connections
      .filter((c) => c.url || c.name)
      .map((c) => ({
        company_id: ctx.company_id,
        employee_id: emp.id,
        linkedin_url: c.url ?? null,
        full_name: c.name ? c.name.trim().toLowerCase() : null,
        connected_on: c.connected_on ?? null,
      }));
    if (!rows.length) return text("No connections had a name or url to store.", true);

    const { error } = await db().from("linkedin_connections").insert(rows);
    if (error) return text(`Couldn't save connections: ${error.message}`, true);
    return text(`Saved ${rows.length} connections for that team member. They'll now surface as 1st-degree warm paths.`);
  },
};
