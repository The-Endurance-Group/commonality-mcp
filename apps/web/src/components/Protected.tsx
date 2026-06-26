import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";

interface Props {
  children: ReactNode;
  admin?: boolean;
  onboarding?: boolean;
}

// Gate a route on a signed-in user with a resolved Commonality session.
export function Protected({ children, admin = false, onboarding = false }: Props) {
  const { ready, needsOnboarding, claims } = useAuthStore();

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        {!ready ? (
          <div className="p-10 text-center text-gray-500">Loading…</div>
        ) : needsOnboarding && !onboarding ? (
          <Navigate to="/onboarding" replace />
        ) : admin && claims?.role !== "admin" ? (
          <div className="p-10 text-center text-gray-600">
            This page is for workspace admins. Ask your admin for access.
          </div>
        ) : (
          children
        )}
      </SignedIn>
    </>
  );
}
