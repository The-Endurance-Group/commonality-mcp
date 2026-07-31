import { db } from "../db/client.js";

/**
 * Atomically increments today's chat-message counter for a company. No
 * daily cap is enforced here anymore - tool calls the chat triggers already
 * cost credits normally, and we're deliberately absorbing the plain
 * Anthropic conversation cost. This just keeps chat_usage_daily populated
 * for the superadmin console's usage visibility.
 */
export async function incrementChatUsage(companyId: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const { data, error } = await db().rpc("increment_chat_usage", { p_company_id: companyId, p_day: day });
  if (error) throw new Error(`increment_chat_usage failed: ${error.message}`);
  return (data as number) ?? 0;
}
