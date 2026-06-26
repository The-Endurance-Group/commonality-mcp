import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";

export function Marketing() {
  // Once the session has resolved, send signed-in users straight to their
  // workspace — first-timers to onboarding, returning users to the dashboard.
  const { ready, token, needsOnboarding } = useAuthStore();
  if (ready && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (ready && token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold text-ink">Commonality</span>
        <div className="flex items-center gap-4 text-sm">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-gray-600 hover:text-ink">Sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="text-brand font-medium">
              Go to dashboard →
            </Link>
          </SignedIn>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Warm intros to any prospect — right inside Claude.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
          Commonality maps your whole team's network and finds the strongest path to
          anyone you want to reach. Set up once, then just ask Claude.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:opacity-90">
                Start free
              </button>
            </SignUpButton>
            <SignUpButton mode="modal">
              <button className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-ink hover:bg-gray-50">
                Get Pro
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:opacity-90">
              Open your workspace
            </Link>
          </SignedIn>
        </div>

        <div className="mx-auto mt-16 aspect-video max-w-2xl rounded-xl border border-dashed border-gray-300 bg-white/60 p-10 text-gray-400">
          Claude demo video coming soon
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-center text-sm text-gray-400">
        © Commonality — The Endurance Group
      </footer>
    </div>
  );
}
