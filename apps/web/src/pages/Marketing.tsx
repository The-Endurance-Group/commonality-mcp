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
  school: "M22 10 12 5 2 10l10 5 10-5z M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5 M22 10v6",
  pin: "M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
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

const capitalSignals = [
  { label: "1st-degree connections", icon: "zap" },
  { label: "Alma mater", icon: "school" },
  { label: "Past companies", icon: "building" },
  { label: "Location", icon: "pin" },
];

const setupSteps: { who: "You" | "We"; label: string; icon: string }[] = [
  { who: "You", label: "Tell us your company", icon: "building" },
  { who: "We", label: "Find your team on LinkedIn", icon: "users" },
  { who: "You", label: "Confirm the roster", icon: "check" },
  { who: "We", label: "Map the social capital", icon: "network" },
  { who: "You", label: "Connect to your AI", icon: "link" },
];

const askSteps: { who: "You" | "We"; label: string; icon: string }[] = [
  { who: "You", label: "Ask about a person or company", icon: "message" },
  { who: "We", label: "Hand back the path", icon: "mail" },
  { who: "We", label: "Help with outreach + strategy", icon: "pencil" },
];

function PipelineGraphic({
  steps,
  startAt = 1,
}: {
  steps: { who: "You" | "We"; label: string; icon: string }[];
  startAt?: number;
}) {
  const gridCols = steps.length > 3 ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className={`mx-auto grid max-w-3xl gap-3 ${gridCols}`}>
      {steps.map((s, i) => (
        <div
          key={s.label}
          className="animate-fade-up relative flex flex-col items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-5 text-center"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
            {startAt + i}
          </span>
          <span
            className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              s.who === "You" ? "bg-tint-accent text-accent" : "bg-tint-brand text-brand"
            }`}
          >
            {s.who}
          </span>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-brand text-brand">
            <Icon name={s.icon} className="" />
          </div>
          <p className="text-xs font-medium leading-tight text-ink sm:text-sm">{s.label}</p>
        </div>
      ))}
    </div>
  );
}


const features = [
  {
    title: "Team network map",
    desc: "Every shared connection across your team, incl. 1st-degree LinkedIn",
    icon: "network",
    tint: "bg-tint-brand text-brand",
  },
  {
    title: "AI-drafted outreach",
    desc: "Claude or ChatGPT writes the intro, grounded in the connection",
    icon: "link",
    tint: "bg-tint-accent text-accent",
  },
  {
    title: "Pipeline tracking",
    desc: "Never lose track of a warm intro or follow-up",
    icon: "history",
    tint: "bg-tint-purple text-purple",
  },
  {
    title: "Lead routing",
    desc: "Auto-route prospects to the rep with the best connection",
    icon: "route",
    tint: "bg-tint-brand text-brand",
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
            Ask your AI &ldquo;what's the best way into Acme?&rdquo; Get an answer for any
            person or company, instantly.
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
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          A warm path gets you in the door. Cold outreach doesn't.
        </h2>
        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="animate-fade-up rounded-lg border border-gray-200 p-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-lavender">
              Without a warm path
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <span className="text-2xl font-bold text-ink">~2%</span>
                <span className="ml-2 text-sm text-lavender">of cold emails get a reply</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-ink">&lt; 30%</span>
                <span className="ml-2 text-sm text-lavender">of cold LinkedIn requests are accepted</span>
              </div>
            </div>
          </div>
          <div
            className="animate-fade-up rounded-lg bg-tint-brand p-6 text-left"
            style={{ animationDelay: "0.1s" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              With a warm path
            </p>
            <div className="mt-4">
              <span className="text-5xl font-bold text-brand">5–10×</span>
              <p className="mt-2 text-sm font-medium text-ink">
                more likely to land a meeting when you go through someone you know
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How matching works */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          How we find the strongest connection
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-lavender">
          We analyze social capital on both sides — every person on your team, and your
          prospect — then rank every possible path.
        </p>

        <div className="mx-auto mt-10 grid max-w-3xl items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-lg border border-gray-100 p-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Your team</p>
            <ul className="mt-4 space-y-3">
              {capitalSignals.map((s) => (
                <li key={s.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-brand text-brand">
                    <Icon name={s.icon} className="" />
                  </div>
                  <span className="text-sm text-ink">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-lavender">
            vs
          </div>

          <div className="rounded-lg border border-gray-100 p-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Your prospect
            </p>
            <ul className="mt-4 space-y-3">
              {capitalSignals.map((s) => (
                <li key={s.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-accent text-accent">
                    <Icon name={s.icon} className="" />
                  </div>
                  <span className="text-sm text-ink">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-tint-purple px-4 py-2 text-sm font-medium text-purple">
          <CheckIcon className="text-purple" />
          Strongest connection, ranked automatically
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
          <PipelineGraphic steps={askSteps} startAt={6} />
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

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
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
