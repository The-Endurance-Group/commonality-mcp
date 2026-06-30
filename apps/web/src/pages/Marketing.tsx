import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";

function CheckIcon({ className = "text-brand" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const ICON_PATHS: Record<string, string> = {
  network: "M12 2 4 7v10l8 5 8-5V7z M12 12v10 M12 12 4 7 M12 12l8-5",
  zap: "M13 2 3 14h7l-1 8 10-12h-7z",
  link: "M9 17H7a5 5 0 0 1 0-10h2 M15 7h2a5 5 0 0 1 0 10h-2 M8 12h8",
  mail: "M3 6h18v12H3z M3 6l9 7 9-7",
  history: "M3 12a9 9 0 1 0 3-6.7 M3 5v5h5",
  sync: "M21 12a9 9 0 0 1-15.3 6.3M3 12a9 9 0 0 1 15.3-6.3 M21 5v5h-5 M3 19v-5h5",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  route: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M5 17v-3a4 4 0 0 1 4-4h6a4 4 0 0 0 4-4",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.35-4.35",
};

function Icon({ name, className = "text-brand" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="animate-chat-2 flex w-fit gap-1 rounded-lg bg-gray-100 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-lavender"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function ChatMock() {
  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-4 text-left shadow-2xl">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        </div>
        <span className="text-xs font-medium text-lavender">Claude</span>
      </div>

      <div className="relative space-y-2.5 text-sm">
        <div className="animate-chat-1 ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-tint-accent px-3 py-2 text-ink">
          Find a warm path to Jane Doe, VP Sales at Acme
        </div>
        <TypingDots />
        <div className="animate-chat-3 w-fit max-w-[90%] rounded-lg rounded-bl-sm bg-tint-brand px-3 py-2">
          <p className="font-medium text-ink">Found it — Sarah Kim</p>
          <p className="text-xs text-lavender">1st-degree LinkedIn · Stanford '14</p>
        </div>
      </div>
    </div>
  );
}

const stats = [
  { value: "~2%", label: "cold email replies" },
  { value: "< 30%", label: "cold LinkedIn accepts" },
  { value: "5–10×", label: "better with a warm intro" },
];

const steps = [
  { n: 1, title: "Load your team", icon: "users" },
  { n: 2, title: "Drop in a prospect", icon: "search" },
  { n: 3, title: "Send the warm intro", icon: "mail" },
];

const features = [
  { title: "Team network map", icon: "network" },
  { title: "1st-degree LinkedIn", icon: "zap" },
  { title: "Claude & ChatGPT drafts", icon: "link" },
  { title: "Pipeline tracking", icon: "history" },
  { title: "HubSpot & Salesforce sync", icon: "sync" },
  { title: "Lead routing", icon: "route" },
];

const testimonials = [
  { quote: "3 meetings in week one.", initial: "A", name: "Alex R.", role: "VP Sales" },
  { quote: "Reply rates tripled.", initial: "M", name: "Morgan T.", role: "Head of Growth" },
];

export function Marketing() {
  // Once the session has resolved, send signed-in users straight to their
  // workspace — first-timers to onboarding, returning users to the dashboard.
  const { ready, token, needsOnboarding } = useAuthStore();
  if (ready && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (ready && token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-content items-center justify-between px-6 py-5">
        <img src="/logo.png" alt="Commonality" className="h-7 w-auto" />
        <div className="flex items-center gap-4 text-sm">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-lavender hover:text-ink">Sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="text-brand font-medium">
              Go to dashboard →
            </Link>
          </SignedIn>
        </div>
      </header>

      {/* Hero */}
      <section className="animate-gradient bg-gradient-to-br from-purple via-brand to-accent px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Warm Introductions, Instantly
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Your next deal is already in your team's network.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/90">
            Mapped, drafted, and sent — right inside Claude or ChatGPT.
          </p>

          <div className="mt-7 flex items-center justify-center gap-3">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-white px-6 py-3 font-medium text-purple transition hover:scale-105 hover:bg-white/90">
                  Start for free
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="rounded-lg bg-white px-6 py-3 font-medium text-purple transition hover:scale-105 hover:bg-white/90"
              >
                Open your workspace
              </Link>
            </SignedIn>
            <a href="#how-it-works" className="px-6 py-3 font-medium text-white hover:underline">
              See how →
            </a>
          </div>
          <p className="mt-3 text-sm text-white/70">No credit card · 10 searches free</p>
        </div>

        <div className="mx-auto mt-12 max-w-md animate-float">
          <ChatMock />
        </div>
      </section>

      {/* Why cold outreach is broken */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <div className="grid gap-8 sm:grid-cols-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className="text-5xl font-bold text-accent">{s.value}</div>
              <div className="mt-2 text-sm font-medium text-lavender">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">60 seconds to a warm intro</h2>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.n}
              className="animate-fade-up flex flex-col items-center gap-3"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tint-brand text-brand transition hover:scale-110">
                <Icon name={step.icon} />
              </div>
              <h3 className="font-semibold text-ink">{step.title}</h3>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white transition hover:scale-105 hover:bg-brand-dark">
                Try it free →
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="rounded-lg bg-brand px-6 py-3 font-medium text-white transition hover:scale-105 hover:bg-brand-dark"
            >
              Open your workspace
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Built for sales teams</h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-up flex flex-col items-center gap-2 rounded-lg bg-tint-accent p-6 transition hover:scale-105"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <Icon name={f.icon} className="text-accent" />
              <div className="text-sm font-medium text-ink">{f.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-content px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.name} className="flex items-center gap-4 rounded-lg bg-tint-brand p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white">
                {t.initial}
              </div>
              <div>
                <p className="font-medium text-ink">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm text-lavender">
                  {t.name} · {t.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Simple pricing</h2>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6 transition hover:scale-105">
            <div className="font-semibold text-ink">Free</div>
            <div className="mt-2 text-3xl font-bold text-ink">$0</div>
            <ul className="mt-4 space-y-2 text-sm text-lavender">
              <li className="flex items-center gap-2">
                <CheckIcon />
                25 team members
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                10 searches
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                CRM sync
              </li>
            </ul>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="mt-6 w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-ink hover:bg-gray-50">
                  Start for free
                </button>
              </SignUpButton>
            </SignedOut>
          </div>

          <div className="relative rounded-lg border-2 border-brand p-6 transition hover:scale-105">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
              Most popular
            </div>
            <div className="font-semibold text-ink">Pro</div>
            <div className="mt-2 text-3xl font-bold text-ink">$199/mo</div>
            <ul className="mt-4 space-y-2 text-sm text-lavender">
              <li className="flex items-center gap-2">
                <CheckIcon />
                150 team members
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                200 searches/mo
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Unlimited users
              </li>
            </ul>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="mt-6 w-full rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                  Start free
                </button>
              </SignUpButton>
            </SignedOut>
          </div>

          <div className="rounded-lg border border-gray-200 p-6 transition hover:scale-105">
            <div className="font-semibold text-ink">Enterprise</div>
            <div className="mt-2 text-3xl font-bold text-ink">Custom</div>
            <ul className="mt-4 space-y-2 text-sm text-lavender">
              <li className="flex items-center gap-2">
                <CheckIcon />
                150+ team members
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                200+ searches/mo
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Custom contract
              </li>
            </ul>
            <a
              href="mailto:hello@theendurancegroup.com"
              className="mt-6 block w-full rounded-lg border border-gray-300 px-6 py-3 text-center font-medium text-ink hover:bg-gray-50"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-footer py-10 text-center text-sm text-white/60">
        <div className="mx-auto max-w-content px-6">© Commonality — The Endurance Group</div>
      </footer>
    </div>
  );
}
