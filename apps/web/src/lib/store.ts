import { create } from "zustand";

export interface Claims {
  role: "admin" | "member";
  plan: "free" | "pro";
  email: string;
  company_id: string;
}

function decode(token: string): Claims | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    // JWT payloads are base64url (- and _, no padding); atob needs base64.
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Claims;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  claims: Claims | null;
  needsOnboarding: boolean;
  ready: boolean; // session exchange has completed (success or onboarding)
  setToken: (token: string) => void;
  setNeedsOnboarding: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  claims: null,
  needsOnboarding: false,
  ready: false,
  setToken: (token) => set({ token, claims: decode(token), needsOnboarding: false, ready: true }),
  setNeedsOnboarding: () => set({ token: null, claims: null, needsOnboarding: true, ready: true }),
  reset: () => set({ token: null, claims: null, needsOnboarding: false, ready: false }),
}));
