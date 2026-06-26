import { config } from "../config.js";

// Commonality delegates user authentication to Clerk via OIDC. We act as a
// relying party: send the user to Clerk's authorize endpoint, exchange the
// returned code for tokens, and read their email from userinfo. Requires a
// Clerk "OAuth application" (CLERK_OAUTH_CLIENT_ID / _SECRET) whose redirect URI
// is `${PUBLIC_BASE_URL}/oauth/callback`.

interface OidcConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  issuer: string;
}

let cachedOidc: OidcConfig | null = null;

async function discover(): Promise<OidcConfig> {
  if (cachedOidc) return cachedOidc;
  const url = `${config.clerkIssuerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Clerk OIDC discovery failed: ${res.status}`);
  cachedOidc = (await res.json()) as OidcConfig;
  return cachedOidc;
}

export function clerkRedirectUri(): string {
  return `${config.publicBaseUrl.replace(/\/$/, "")}/oauth/callback`;
}

/** Build the URL to send the user to Clerk for sign-in. */
export async function buildClerkAuthorizeUrl(state: string): Promise<string> {
  const oidc = await discover();
  const params = new URLSearchParams({
    client_id: config.clerkOAuthClientId,
    redirect_uri: clerkRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `${oidc.authorization_endpoint}?${params.toString()}`;
}

/** Exchange Clerk's authorization code for tokens. */
export async function exchangeClerkCode(code: string): Promise<{ accessToken: string }> {
  const oidc = await discover();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: clerkRedirectUri(),
    client_id: config.clerkOAuthClientId,
    client_secret: config.clerkOAuthClientSecret,
  });
  const res = await fetch(oidc.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clerk token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return { accessToken: data.access_token };
}

export interface ClerkUser {
  email: string;
  name?: string;
  sub: string;
}

/** Read the authenticated user's profile from Clerk's userinfo endpoint. */
export async function getClerkUser(accessToken: string): Promise<ClerkUser> {
  const oidc = await discover();
  const res = await fetch(oidc.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Clerk userinfo failed: ${res.status}`);
  const data = (await res.json()) as {
    email?: string;
    email_address?: string;
    name?: string;
    sub: string;
  };
  const email = data.email ?? data.email_address;
  if (!email) throw new Error("Clerk userinfo returned no email");
  return { email, name: data.name, sub: data.sub };
}
