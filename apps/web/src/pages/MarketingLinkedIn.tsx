import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ConnectorDemo } from "../components/ConnectorDemo";
import { JoinNoticeScreen } from "../components/JoinNoticeScreen";
import { useAuthStore } from "../lib/store";

// Standalone duplicate of Marketing.tsx, reframed around "access LinkedIn via
// Claude" instead of "warm intros via your team." Deliberately duplicated
// (not shared) so this page can be iterated on/removed without touching the
// live Marketing.tsx page or its private helper components.

const DEMO_NATURAL_WIDTH = 604;
const DEMO_NATURAL_HEIGHT = 676;

function WorkflowRow() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const [demoHeight, setDemoHeight] = useState(460);

  useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setDemoHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = demoHeight / DEMO_NATURAL_HEIGHT;

  return (
    <div className="mt-4 flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
      <div ref={stepsRef} className="flex w-full max-w-xs flex-col gap-6 text-left lg:max-w-[240px]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-lavender">Set up once</p>
          <div className="flex flex-col gap-3">
            {setupSteps.map((s, i) => (
              <div
                key={s.label}
                className="animate-fade-up flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint-brand text-brand">
                  <Icon name={s.icon} className="" />
                </div>
                <p className="text-sm font-medium text-ink">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-lavender">Then ask anytime</p>
          <div className="flex flex-col gap-3">
            {askSteps.map((s, i) => (
              <div
                key={s.label}
                className="animate-fade-up flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
                  {setupSteps.length + i + 1}
                </span>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint-brand text-brand">
                  <Icon name={s.icon} className="" />
                </div>
                <p className="text-sm font-medium text-ink">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: demoHeight, width: DEMO_NATURAL_WIDTH * scale }} className="overflow-hidden rounded-lg">
        <div style={{ width: DEMO_NATURAL_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <ConnectorDemo />
        </div>
      </div>
    </div>
  );
}

function SectionCta({ label }: { label: string }) {
  return (
    <div className="mt-10">
      <SignedOut>
        <SignUpButton mode="modal">
          <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white transition hover:scale-105 hover:bg-brand-dark">
            {label}
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Link
          to="/dashboard"
          className="inline-block rounded-lg bg-brand px-6 py-3 font-medium text-white transition hover:scale-105 hover:bg-brand-dark"
        >
          {label}
        </Link>
      </SignedIn>
    </div>
  );
}

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
  message:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  mail: "M3 6h18v12H3z M3 6l9 7 9-7",
  pencil: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
  school: "M22 10 12 5 2 10l10 5 10-5z M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5 M22 10v6",
  pin: "M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  post: "M4 4h16v16H4z M4 9h16 M9 4v16",
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
    q: "Research Jane Doe, VP Sales at Acme, before I reach out",
    title: "1st-degree connection found",
    detail: "Sam K. is already connected to Jane on LinkedIn",
  },
  {
    q: "What's our best way into Acme Corp as a target account?",
    title: "Account-based path",
    detail: "Sam K. has the strongest combined connection across Acme's leadership",
  },
  {
    q: "No one on our team knows Marcus Lee at Globex - what's my angle?",
    title: "Research fallback",
    detail: "Marcus posted about supply-chain automation last week - good opener",
  },
  {
    q: "Anyone with a connection to Dana Ruiz, CTO at Vantage?",
    title: "Alma mater",
    detail: "Devon R. and Dana both went to Wharton - MBA '16",
  },
  {
    q: "What's Vantage Corp been posting about lately?",
    title: "Company research",
    detail: "3 recent posts on their new product line - use it in your opener",
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

const socialMapPaths = [
  { name: "Sam K.", signal: "1st-degree LinkedIn", x: 70, strongest: true },
  { name: "Devon R.", signal: "Both Wharton MBA, '16", x: 230, strongest: false },
  { name: "Priya N.", signal: "Both worked at Initech", x: 390, strongest: false },
  { name: "Alex P.", signal: "Both live in Portland, ME", x: 550, strongest: false },
];

const mobileFanX = [-70, -25, 25, 70];

function SocialMapMobile() {
  const colX = 170;
  const rowGap = 78;
  const rowStart = 56;
  const prospectY = rowStart + rowGap * socialMapPaths.length + 40;
  const rows = socialMapPaths.map((p, i) => ({
    ...p,
    x: colX + mobileFanX[i],
    y: rowStart + i * rowGap,
  }));
  const orderedLines = [...rows.filter((p) => !p.strongest), ...rows.filter((p) => p.strongest)];

  return (
    <div className="mx-auto max-w-xs sm:hidden">
      <svg
        viewBox={`0 0 340 ${prospectY + 60}`}
        className="mx-auto h-auto w-full"
        aria-hidden="true"
      >
        {orderedLines.map((p, i) => (
          <line
            key={`line-${p.name}`}
            x1={p.x}
            y1={p.y + 22}
            x2={colX}
            y2={prospectY - 22}
            stroke={p.strongest ? "#C45E89" : "#E5E7EB"}
            strokeWidth={p.strongest ? 3 : 1.5}
            className={p.strongest ? "sm-line sm-line-strong" : "sm-line"}
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}

        <g transform={`translate(${colX}, ${prospectY})`}>
          <circle r="22" fill="#65B6AE" />
          <text x="0" y="40" fontSize="14" fontWeight="600" fill="#1A1A1A" textAnchor="middle">
            Jane Doe
          </text>
          <text x="0" y="57" fontSize="12" fill="#645D69" textAnchor="middle">
            VP Sales, Acme
          </text>
        </g>

        {rows.map((p) => (
          <g key={p.name} transform={`translate(${p.x}, ${p.y})`}>
            <circle
              r="20"
              fill={p.strongest ? "#C45E89" : "#FBEAF1"}
              stroke={p.strongest ? "#C45E89" : "#E5E7EB"}
              strokeWidth="1.5"
              className={p.strongest ? "sm-node-strong" : ""}
            />
            <text x="0" y="-42" fontSize="14" fontWeight="600" fill="#1A1A1A" textAnchor="middle">
              {p.name}
            </text>
            <text
              x="0"
              y="-26"
              fontSize="12"
              fill={p.strongest ? "#C45E89" : "#645D69"}
              textAnchor="middle"
            >
              {p.signal}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SocialMapGraphic() {
  const rowY = 30;
  const prospectY = 170;
  const prospectX = 310;

  return (
    <>
      <SocialMapMobile />
      <div className="mx-auto hidden max-w-3xl sm:block">
        <svg viewBox="0 0 620 280" className="mx-auto h-auto w-full" aria-hidden="true">
          {socialMapPaths.map((p, i) => (
            <line
              key={`line-${p.name}`}
              x1={p.x}
              y1={rowY + 22}
              x2={prospectX}
              y2={prospectY - 22}
              stroke={p.strongest ? "#C45E89" : "#E5E7EB"}
              strokeWidth={p.strongest ? 3 : 1.5}
              className={p.strongest ? "sm-line sm-line-strong" : "sm-line"}
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}

          <g transform={`translate(${prospectX}, ${prospectY})`}>
            <circle r="22" fill="#65B6AE" />
            <text x="0" y="40" fontSize="13" fontWeight="600" fill="#1A1A1A" textAnchor="middle">
              Jane Doe
            </text>
            <text x="0" y="56" fontSize="11" fill="#645D69" textAnchor="middle">
              VP Sales, Acme
            </text>
          </g>

          {socialMapPaths.map((p) => (
            <g key={p.name} transform={`translate(${p.x}, ${rowY})`}>
              <circle
                r="20"
                fill={p.strongest ? "#C45E89" : "#FBEAF1"}
                stroke={p.strongest ? "#C45E89" : "#E5E7EB"}
                strokeWidth="1.5"
                className={p.strongest ? "sm-node-strong" : ""}
              />
              <text x="0" y="40" fontSize="13" fontWeight="600" fill="#1A1A1A" textAnchor="middle">
                {p.name}
              </text>
              <text
                x="0"
                y="56"
                fontSize="11"
                fill={p.strongest ? "#C45E89" : "#645D69"}
                textAnchor="middle"
              >
                {p.signal}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}

const setupSteps = [
  { label: "Tell us your company", icon: "building" },
  { label: "We find your team - you confirm", icon: "users" },
  { label: "Connect to your AI", icon: "link" },
];

const askSteps = [
  { label: "Ask about a person or company", icon: "message" },
  { label: "Get a warm path - or a real angle in", icon: "mail" },
];

const realtyOneTestimonial = {
  quote:
    "Working with The Endurance Group was absolutely amazing. They introduced a LinkedIn outreach solution that has been a fantastic addition to our prospecting strategy. TEG totally exceeded our expectations.",
  name: "Sevag Sarkissian",
  title: "VP Growth Marketing, Realty ONE Group",
};

export function MarketingLinkedIn() {
  // Same session-aware redirect behavior as the primary Marketing page.
  const { ready, token, needsOnboarding, joinNotice } = useAuthStore();
  if (ready && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (ready && token && joinNotice) return <JoinNoticeScreen />;
  if (ready && token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-content items-center justify-between gap-4 px-6 py-5">
        <img src="/logo.png" alt="Commonality" className="h-7 w-auto shrink-0" />
        <div className="flex items-center gap-4 text-sm">
          <a href="#pricing" className="hidden font-medium text-lavender hover:text-ink sm:inline">
            Pricing
          </a>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent-dark">
                Sign in
              </button>
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
            LinkedIn Research, Right From Claude
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Access LinkedIn, right from Claude.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/90">
            Ask Claude to research a prospect or a company and get real answers - who you know
            there, what they've posted lately, what's worth mentioning when you reach out.
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
          <p className="mt-3 text-sm text-white/70">
            One proprietary edge: Commonality checks your team's own network first, before anything else.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-md animate-float">
          <ChatMock />
          <p className="mt-4 text-sm text-white/70">Ask about a person or a whole company - anytime</p>
        </div>
      </section>

      {/* Two ways in */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">There's always a way in.</h2>
        <p className="mx-auto mt-2 max-w-xl text-lavender">
          Commonality is our proprietary matching tech, and it's the strongest way in when it
          applies. When it doesn't, Claude still does the legwork.
        </p>
        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
          <div
            className="animate-fade-up rounded-lg bg-tint-brand p-6 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Warm path found</p>
            <p className="mt-3 text-sm font-medium text-ink">
              Commonality checks your whole team's LinkedIn connections, schools, and employers to
              find who can make the intro - the strongest way in there is.
            </p>
          </div>
          <div
            className="animate-fade-up rounded-lg border border-gray-200 p-6 text-left"
            style={{ animationDelay: "0.1s" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-lavender">No warm path (yet)</p>
            <p className="mt-3 text-sm text-ink">
              Claude pulls the prospect's background and recent posts, checks what their company's
              been talking about, and gives you something real to open with.
            </p>
          </div>
        </div>

        <SectionCta label="Find your way in to your top prospect now →" />
      </section>

      {/* How matching works */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          How Commonality finds your way in
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-lavender">
          We analyze social capital on both sides - every person on your team, and your
          prospect - then rank every possible path.
        </p>

        <div className="animate-fade-up mt-10">
          <SocialMapGraphic />
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-tint-brand px-4 py-2 text-sm font-medium text-brand">
          <CheckIcon className="text-brand" />
          Strongest connection, ranked automatically
        </div>

        <SectionCta label="See my warmest path to a prospect →" />
      </section>

      {/* Research fallback */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">No warm path? Claude still finds an angle.</h2>
        <p className="mx-auto mt-2 max-w-xl text-lavender">
          Ask, and Claude pulls the prospect's recent LinkedIn posts and the target company's
          recent activity - real, specific material for your opener, not a generic cold message.
        </p>
        <div className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
          <div className="animate-fade-up rounded-lg border border-gray-200 p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tint-brand text-brand">
              <Icon name="post" />
            </div>
            <p className="mt-3 text-sm font-medium text-ink">Their recent posts</p>
            <p className="mt-1 text-sm text-lavender">
              What the prospect has been posting about lately - a natural reason to reach out.
            </p>
          </div>
          <div
            className="animate-fade-up rounded-lg border border-gray-200 p-6"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tint-brand text-brand">
              <Icon name="building" />
            </div>
            <p className="mt-3 text-sm font-medium text-ink">Their company's activity</p>
            <p className="mt-1 text-sm text-lavender">
              What the target company's been talking about - context that makes your outreach land.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">From setup to your next warm intro</h2>

        <WorkflowRow />

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

      {/* Testimonial */}
      <section className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
          Trusted by teams who needed a real way in
        </h2>

        <div className="mx-auto mt-10 max-w-2xl rounded-lg bg-tint-brand p-6 text-left sm:p-8">
          <blockquote className="text-base italic text-ink">
            &ldquo;{realtyOneTestimonial.quote}&rdquo;
          </blockquote>
          <p className="mt-4 text-sm font-medium text-lavender">
            - {realtyOneTestimonial.name}, {realtyOneTestimonial.title}
          </p>
        </div>

        <div className="text-center">
          <SectionCta label="Get results like these →" />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Simple pricing</h2>
        <p className="mt-2 text-center text-sm text-lavender">
          Commonality is built and installed for you by The Endurance Group.
        </p>

        <div className="mx-auto mt-10 max-w-md rounded-lg border-2 border-brand p-6 text-center transition hover:scale-105">
          <div className="font-semibold text-ink">TEG Membership</div>
          <div className="mt-2 text-3xl font-bold text-ink">Starting at $149/mo</div>
          <ul className="mt-4 space-y-2 text-left text-sm text-lavender">
            <li className="flex items-center gap-2">
              <CheckIcon />
              Commonality installed free as a new member
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon />
              Ongoing maintenance, fixes, and strategy calls included
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon />
              Access to more TEG automations for your team
            </li>
          </ul>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="mt-6 w-full rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                Start free
              </button>
            </SignUpButton>
          </SignedOut>
          <p className="mt-4 text-xs text-lavender">
            Includes 100 Commonality credits/month. Need more? We'll work out pricing together.
          </p>
        </div>
      </section>

      <footer className="bg-footer py-10 text-center text-sm text-white/60">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-2 px-6">
          <span>© Commonality - The Endurance Group</span>
          <span>·</span>
          <a href="https://theendurancegroup.com" className="hover:text-white">
            theendurancegroup.com
          </a>
          <span>·</span>
          <Link to="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-white">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
