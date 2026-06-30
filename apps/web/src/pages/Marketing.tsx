import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
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
  history: "M3 12a9 9 0 1 0 3-6.7 M3 5v5h5",
  route: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M5 17v-3a4 4 0 0 1 4-4h6a4 4 0 0 0 4-4",
  building: "M3 21h18 M5 21V7l7-4 7 4v14 M9 9h1 M9 13h1 M14 9h1 M14 13h1",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  check: "M20 6 9 17l-5-5",
  message:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  mail: "M3 6h18v12H3z M3 6l9 7 9-7",
  pencil: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
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

function TypingDotsRow() {
  return (
    <div className="animate-fade-up flex w-fit gap-1 rounded-lg bg-gray-100 px-3 py-2.5">
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

const chatExamples = [
  {
    q: "Find a warm path to Jane Doe, VP Sales at Acme",
    title: "1st-degree connection",
    detail: "Sam K. is already connected to Jane on LinkedIn",
  },
  {
    q: "What's our best way into Acme Corp as a target account?",
    title: "Account-based path",
    detail: "Sam K. has the strongest combined connection across Acme's leadership",
  },
  {
    q: "Best way into Globex Corp for Marcus Lee, Head of Procurement?",
    title: "Past company",
    detail: "Priya N. worked with Marcus at Initech for 3 years",
  },
  {
    q: "Anyone with a connection to Dana Ruiz, CTO at Vantage?",
    title: "Alma mater",
    detail: "Devon R. and Dana both went to Wharton — MBA '16",
  },
  {
    q: "Anyone close to our prospect in Portland, ME?",
    title: "Same hometown",
    detail: "Alex P. is also based in Portland, Maine",
  },
];

function ChatMock() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"typing" | "answer">("typing");

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % chatExamples.length), 4200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setPhase("typing");
    const t = setTimeout(() => setPhase("answer"), 1100);
    return () => clearTimeout(t);
  }, [step]);

  const ex = chatExamples[step];

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-4 text-left shadow-2xl">
      <div className="mb-3 flex gap-1.5 border-b border-gray-100 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
      </div>

      <div className="flex min-h-[110px] flex-col justify-start gap-2.5 text-sm">
        <div
          key={`q-${step}`}
          className="animate-fade-up ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-tint-accent px-3 py-2 text-ink"
        >
          {ex.q}
        </div>
        {phase === "typing" ? (
          <TypingDotsRow />
        ) : (
          <div className="animate-fade-up w-fit max-w-[90%] rounded-lg rounded-bl-sm bg-tint-brand px-3 py-2">
            <p className="font-medium text-ink">{ex.title}</p>
            <p className="text-xs text-lavender">{ex.detail}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {chatExamples.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-6 bg-brand" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const setupSteps = [
  { label: "Pick your company", icon: "building" },
  { label: "Find your team on LinkedIn", icon: "users" },
  { label: "Confirm the roster", icon: "check" },
  { label: "Map social capital", icon: "network" },
  { label: "Connect your AI", icon: "link" },
];

const askSteps = [
  { label: "Ask: a person or a company", icon: "message" },
  { label: "Get Path", icon: "mail" },
  { label: "Outreach + Strategy", icon: "pencil" },
];

function PipelineGraphic({ steps, intervalMs = 1700 }: { steps: { label: string; icon: string }[]; intervalMs?: number }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), intervalMs);
    return () => clearInterval(id);
  }, [steps.length, intervalMs]);

  return (
    <div className="mx-auto max-w-3xl overflow-x-auto px-1 pb-2">
      <div className="relative flex min-w-[480px] items-start justify-between">
        <div className="absolute left-0 right-0 top-6 h-0.5 bg-gray-200" />
        <div
          className="absolute left-0 top-6 h-0.5 bg-brand transition-all duration-700 ease-in-out"
          style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((s, i) => {
          const status = i < step ? "done" : i === step ? "active" : "upcoming";
          return (
            <div key={s.label} className="relative z-10 flex flex-1 flex-col items-center px-1 text-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  status === "done"
                    ? "border-brand bg-brand"
                    : status === "active"
                      ? "scale-110 border-brand bg-white shadow-lg"
                      : "border-gray-200 bg-white"
                }`}
              >
                {status === "done" ? (
                  <CheckIcon className="text-white" />
                ) : (
                  <Icon name={s.icon} className={status === "active" ? "text-brand" : "text-gray-300"} />
                )}
              </div>
              <p className={`mt-2 text-xs font-medium ${status === "upcoming" ? "text-gray-300" : "text-ink"}`}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const stats = [
  { value: "~2%", label: "cold email replies" },
  { value: "< 30%", label: "cold LinkedIn accepts" },
  { value: "5–10×", label: "better with a warm intro" },
];

const features = [
  {
    title: "Team network map",
    desc: "See every shared connection across your whole team",
    icon: "network",
    tint: "bg-tint-brand text-brand",
  },
  {
    title: "1st-degree LinkedIn",
    desc: "Direct connections surface first — your strongest path in",
    icon: "zap",
    tint: "bg-tint-accent text-accent",
  },
  {
    title: "AI-drafted outreach",
    desc: "Claude or ChatGPT writes the intro, grounded in the connection",
    icon: "link",
    tint: "bg-tint-purple text-purple",
  },
  {
    title: "Pipeline tracking",
    desc: "Never lose track of a warm intro or follow-up",
    icon: "history",
    tint: "bg-tint-brand text-brand",
  },
  {
    title: "Lead routing",
    desc: "Auto-route prospects to the rep with the best connection",
    icon: "route",
    tint: "bg-tint-purple text-purple",
  },
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
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/90">
            Ask your AI &ldquo;what's the best way into Acme?&rdquo; or &ldquo;how do I meet
            their VP of Sales?&rdquo; — anytime, for any person or company. Commonality maps
            your team's social capital to answer.
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
          <p className="mt-4 text-sm text-white/70">Ask about a person or a whole company — anytime</p>
        </div>
      </section>

      {/* Why cold outreach is broken */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Why cold outreach is broken</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
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
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">From setup to warm intro</h2>

        <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-lavender">
          Set up once
        </p>
        <div className="mt-4">
          <PipelineGraphic steps={setupSteps} />
        </div>

        <p className="mt-10 text-sm font-semibold uppercase tracking-wide text-lavender">
          Then ask anytime — about a person or a company
        </p>
        <div className="mt-4">
          <PipelineGraphic steps={askSteps} intervalMs={1900} />
        </div>
        <p className="mt-4 text-sm text-lavender">
          New prospect or new target account — just ask.
        </p>

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
      <section className="mx-auto max-w-content px-6 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Everything you need to work warm</h2>
          <p className="mt-2 text-lavender">
            Built for sales teams selling through the AI platform they already use.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-up flex items-start gap-4 rounded-lg border border-gray-100 p-5 text-left transition hover:scale-105 hover:shadow-md"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${f.tint}`}>
                <Icon name={f.icon} className="" />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">{f.title}</div>
                <div className="mt-1 text-sm text-lavender">{f.desc}</div>
              </div>
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
