import { config } from "../config.js";

// Clerk Backend API: look up a user's primary email by Clerk user id. Used
// during the web app's session→Commonality-JWT exchange so the email is sourced
// from Clerk, not the client.

const CLERK_API = "https://api.clerk.com/v1";

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}
interface ClerkUserResponse {
  primary_email_address_id: string | null;
  email_addresses: ClerkEmailAddress[];
}

export async function getClerkUserEmail(userId: string): Promise<string> {
  const res = await fetch(`${CLERK_API}/users/${userId}`, {
    headers: { Authorization: `Bearer ${config.clerkSecretKey}` },
  });
  if (!res.ok) throw new Error(`Clerk backend user lookup failed: ${res.status}`);
  const user = (await res.json()) as ClerkUserResponse;
  const primary =
    user.email_addresses.find((e) => e.id === user.primary_email_address_id) ??
    user.email_addresses[0];
  if (!primary) throw new Error("Clerk user has no email address");
  return primary.email_address;
}
