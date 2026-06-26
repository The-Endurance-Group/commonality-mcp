import type { SignableClaims } from "./jwt.js";

// Short-lived server-side state for the OAuth authorization-code flow.
// In-memory: fine for a single instance. For multiple Railway replicas this
// must move to Redis/Postgres — flagged for later.

const TTL_MS = 10 * 60 * 1000; // 10 minutes

/** A pending /oauth/authorize request, parked while the user signs in with Clerk. */
export interface PendingAuth {
  clientRedirectUri: string;
  clientState?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  createdAt: number;
}

/** An issued Commonality authorization code, awaiting exchange at /oauth/token. */
export interface IssuedCode {
  claims: SignableClaims;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  clientRedirectUri: string;
  createdAt: number;
}

const pending = new Map<string, PendingAuth>();
const codes = new Map<string, IssuedCode>();

function prune(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [k, v] of pending) if (v.createdAt < cutoff) pending.delete(k);
  for (const [k, v] of codes) if (v.createdAt < cutoff) codes.delete(k);
}

export function putPending(txnId: string, value: Omit<PendingAuth, "createdAt">): void {
  prune();
  pending.set(txnId, { ...value, createdAt: Date.now() });
}

export function takePending(txnId: string): PendingAuth | undefined {
  prune();
  const v = pending.get(txnId);
  if (v) pending.delete(txnId);
  return v;
}

export function putCode(code: string, value: Omit<IssuedCode, "createdAt">): void {
  prune();
  codes.set(code, { ...value, createdAt: Date.now() });
}

export function takeCode(code: string): IssuedCode | undefined {
  prune();
  const v = codes.get(code);
  if (v) codes.delete(code); // single-use
  return v;
}
