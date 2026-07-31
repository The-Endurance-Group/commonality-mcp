import { db } from "../db/client.js";

/**
 * Atomically increments today's chat-message counter for a company and
 * reports whether this message is still under the daily cap. Increments
 * first (via the increment_chat_usage RPC) even for the message that ends up
 * rejected - simpler than a separate check-then-increment round trip, and
 * harmless since a rejected message never reaches the (costly) Anthropic
 * call below it.
 */
export async function checkAndIncrementChatUsage(
  companyId: string,
  limit: number,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const day = new Date().toISOString().slice(0, 10);
  const { data, error } = await db().rpc("increment_chat_usage", { p_company_id: companyId, p_day: day });
  if (error) throw new Error(`increment_chat_usage failed: ${error.message}`);
  const used = (data as number) ?? 0;
  return { allowed: used <= limit, used, limit };
}
