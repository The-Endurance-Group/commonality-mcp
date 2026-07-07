import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";

interface Props {
  children: ReactNode;
  admin?: boolean;
  onboarding?: boolean;
  superadmin?: boolean;
}

// Gate a route on a signed-in user with a resolved Commonality session.
export function Protected({ children, admin = false, onboarding = false, superadmin = false }: Props) {
  const { ready, needsOnboarding, authError, claims } = useAuthStore();

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        {!ready ? (
          <div className="p-10 text-center text-lavender">Loading…</div>
        ) : authError ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center text-lavender">
            <p>Couldn't verify your session. Please try again.</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : needsOnboarding && !onboarding ? (
          <Navigate to="/onboarding" replace />
        ) : superadmin && !claims?.is_superadmin ? (
          <Navigate to="/dashboard" replace />
        ) : admin && claims?.role !== "admin" ? (
          <div className="p-10 text-center text-lavender">
            This page is for workspace admins. Ask your admin for access.
          </div>
        ) : (
          children
        )}
      </SignedIn>
    </>
  );
}
