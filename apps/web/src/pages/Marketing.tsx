import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
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
  sync: "M21 12a9 9 0 0 1-15.3 6.3M3 12a9 9 0 0 1 15.3-6.3 M21 5v5h-5 M3 19v-5h5",
  route: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M5 17v-3a4 4 0 0 1 4-4h6a4 4 0 0 0 4-4",
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
    title: "1st-degree LinkedIn match",
    detail: "Sam K. is already connected to Jane on LinkedIn",
  },
  {
    q: "Best way into Globex Corp?",
    title: "Two ways in",
    detail: "Worked together at Initech · Same MBA — Wharton '16",
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

function StepCompany() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-lavender">
        Acme Inc.
      </div>
      <div className="flex items-center justify-between rounded-lg bg-tint-brand px-3 py-2 text-sm font-medium text-brand">
        Acme Inc. — 84 employees
        <CheckIcon />
      </div>
    </div>
  );
}

function StepFind() {
  const names = ["JD", "SK", "MT", "RL", "AP"];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {names.map((n, i) => (
        <div
          key={n}
          className="animate-fade-up flex h-10 w-10 items-center justify-center rounded-full bg-tint-accent text-xs font-semibold text-accent"
          style={{ animationDelay: `${i * 0.12}s` }}
        >
          {n}
        </div>
      ))}
    </div>
  );
}

function StepRoster() {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between rounded-lg bg-tint-accent px-3 py-2 text-ink">
        Jordan D. <CheckIcon className="text-accent" />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-tint-brand px-3 py-2 text-ink">
        Sam K. <CheckIcon className="text-brand" />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-lavender line-through">
        Wrong contact <span className="text-xs">removed</span>
      </div>
    </div>
  );
}

function StepCapital() {
  const tags = ["🎓 Stanford", "🏢 Salesforce", "📍 Austin"];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand font-semibold text-white">
        SK
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {tags.map((t, i) => (
          <span
            key={t}
            className="animate-fade-up rounded-full bg-tint-purple px-3 py-1 text-xs font-medium text-purple"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepConnect() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="rounded-lg bg-tint-brand px-4 py-3 text-sm font-semibold text-brand">
        Commonality
      </div>
      <CheckIcon className="text-accent" />
      <div className="rounded-lg bg-tint-accent px-4 py-3 text-sm font-semibold text-accent">
        Claude / ChatGPT
      </div>
    </div>
  );
}

function StepAsk() {
  return (
    <div className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-sm bg-tint-accent px-3 py-2 text-left text-sm text-ink">
      Best way to get a meeting with Jane Doe at Acme?
    </div>
  );
}

function StepAnswer() {
  return (
    <div className="space-y-2 text-left text-sm">
      <div className="w-fit max-w-[95%] rounded-lg rounded-bl-sm bg-tint-brand px-3 py-2">
        <p className="font-medium text-ink">Go through Sam K. — 1st-degree LinkedIn</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-tint-purple px-3 py-1 text-xs font-medium text-purple">
          Email drafted
        </span>
        <span className="rounded-full bg-tint-purple px-3 py-1 text-xs font-medium text-purple">
          Call prep ready
        </span>
      </div>
    </div>
  );
}

const tourSteps = [
  { label: "Pick your company", Visual: StepCompany },
  { label: "We find your team on LinkedIn", Visual: StepFind },
  { label: "You confirm the roster", Visual: StepRoster },
  { label: "We map social capital", Visual: StepCapital },
  { label: "Connect to Claude or ChatGPT", Visual: StepConnect },
  { label: "Ask AI for the best way in", Visual: StepAsk },
  { label: "Get the path, email & call prep", Visual: StepAnswer },
];

function ProductTour() {
  const [step, setStep] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setStep((s) => (s + 1) % tourSteps.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const Visual = tourSteps[step].Visual;

  return (
    <div
      className="mx-auto max-w-md"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg bg-white p-6 shadow-xl">
        <div key={step} className="animate-fade-up w-full">
          <Visual />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-ink">{tourSteps[step].label}</p>
      <div className="mt-3 flex justify-center gap-1.5">
        {tourSteps.map((s, i) => (
          <button
            key={s.label}
            type="button"
            aria-label={`Go to step ${i + 1}`}
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-6 bg-brand" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
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
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">From setup to warm intro</h2>

        <div className="mt-10">
          <ProductTour />
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
