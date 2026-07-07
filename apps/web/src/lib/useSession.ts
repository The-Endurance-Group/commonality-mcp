import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useAuthStore } from "./store";

// On Clerk sign-in, exchange the Clerk session for a Commonality JWT (or learn
// the user still needs onboarding). Re-runs whenever the sign-in state flips.
export function useSessionBootstrap(): void {
  const { isSignedIn, getToken } = useAuth();
  const setToken = useAuthStore((s) => s.setToken);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const setAuthError = useAuthStore((s) => s.setAuthError);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isSignedIn) {
        reset();
        return;
      }
      try {
        const clerkToken = await getToken();
        const res = await fetch("/api/auth/token", {
          method: "POST",
          headers: { Authorization: `Bearer ${clerkToken}` },
        });
        const data = (await res.json().catch(() => ({}))) as {
          access_token?: string;
          needsOnboarding?: boolean;
          joined_existing_company?: { companyName: string; adminEmail: string };
        };
        if (cancelled) return;
        if (data.access_token) setToken(data.access_token, data.joined_existing_company);
        // Only the server explicitly saying "no workspace for this email"
        // means onboarding - any other failure (a timeout, a 401, a 500) is
        // transient and must never be treated the same way, or an existing
        // user with a slow/failed request gets misrouted to /onboarding.
        else if (data.needsOnboarding) setNeedsOnboarding();
        else setAuthError();
      } catch {
        if (!cancelled) setAuthError();
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken, setToken, setNeedsOnboarding, setAuthError, reset]);
}
