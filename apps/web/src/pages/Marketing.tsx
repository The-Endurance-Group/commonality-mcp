import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ConnectorDemo } from "../components/ConnectorDemo";
import { JoinNoticeScreen } from "../components/JoinNoticeScreen";
import { useAuthStore } from "../lib/store";

// ConnectorDemo's natural, unscaled size (its stage's min-height plus the
// caption line below it).
const DEMO_NATURAL_WIDTH = 604;
const DEMO_NATURAL_HEIGHT = 676;

// Scales ConnectorDemo to exactly fill its flex-stretched container's
// height (matching the sibling step list), instead of a fixed size.
// Renders the "Set up once" / "Then ask anytime" step list beside the
// connector demo, sized to match it exactly. Measures the step column's
// own rendered height directly (rather than relying on flex-stretch to
// propagate through several nested divs, which proved unreliable) and
// applies it as an explicit pixel height/width to the demo, so the demo
// can never render larger than the steps beside it.
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
    detail: "Devon R. and Dana both went to Wharton - MBA '16",
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

const socialMapPaths = [
  { name: "Sam K.", signal: "1st-degree LinkedIn", x: 70, strongest: true },
  { name: "Devon R.", signal: "Both Wharton MBA, '16", x: 230, strongest: false },
  { name: "Priya N.", signal: "Both worked at Initech", x: 390, strongest: false },
  { name: "Alex P.", signal: "Both live in Portland, ME", x: 550, strongest: false },
];

// Wide enough that the line from the topmost (strongest) node to the
// prospect clears every other node's circle on the way down, instead of
// grazing through them.
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
  { label: "Get the path, intro, and strategy", icon: "mail" },
];


const caseStudies = [
  {
    company: "FenestraPro",
    logo: "/logos/fenestrapro.webp",
    tags: ["B2B Technology", "Sales Execution"],
    story:
      "FenestraPro had a list of target firms they'd been trying to reach for years with no traction. We mapped the shared history between their team and those target firms, found the warm paths in, and ran an outreach motion built on those real connections.",
    result:
      "Average response rate: 30%. Real conversations opened with firms that had been unreachable through conventional outreach.",
    quote:
      "The Endurance Group's strategy of using shared experiences to establish connections and book meetings with prospects has worked incredibly well. Their efforts have resulted in an average 30% response rate and started conversations with key firms that we'd been interested in pursuing for years.",
    name: "David Palmer",
    title: "CEO & Founder, FenestraPro",
  },
  {
    company: "Huron",
    logo: "/logos/huron.webp",
    tags: ["Professional Services", "Relationship Expansion"],
    story:
      "Huron's team wanted to grow their network in a way that felt authentic rather than another round of cold outreach. We ran relationship expansion campaigns that connected their people with prospects who shared real, specific backgrounds with them, turning cold contacts into known entities.",
    result:
      "TEG's relationship expansion campaigns are well-named. By connecting with prospects you share backgrounds with, you develop authentic connections and become a known entity in your space.",
    quote:
      "You build your brand and network among individuals who may look to you in the near future for your perspective or when they have business needs aligned to your areas of expertise.",
    name: "Ben Chrischelles",
    title: "Senior Director, Huron",
  },
  {
    company: "Edify Software",
    logo: "/logos/edify.webp",
    tags: ["Professional Services", "Sales Execution"],
    story:
      "Edify had grown entirely through referrals but had no consistent pipeline. We built the sales infrastructure, generated leads, created content, and executed outreach that resulted in long-term client relationships worth hundreds of thousands of dollars.",
    result: "Edify has since grown to 60 full-time employees.",
    quote:
      "Over the course of several years, our work with The Endurance Group has been instrumental in gaining valuable insights about our market space and establishing connections with the right individuals and organizations, ultimately leading to new long-term client relationships.",
    name: "Federico Hess",
    title: "Partner & CEO, Edify Software",
  },
];

const shortQuotes = [
  {
    quote: "TEG found and landed the meeting that turned into our largest client. I recommend TEG without reservation.",
    name: "Michael Prevost",
    title: "CEO, VividCloud",
    logo: "/logos/vividcloud.webp",
  },
  {
    quote:
      "The Endurance Group's efforts to expand our business through networking with like-minded health and safety leaders have helped SaltGrid develop new business relationships across the globe.",
    name: "Chris Aitken",
    title: "CEO, SaltGrid",
    logo: "/logos/saltgrid.webp",
  },
  {
    quote: "Their lead generation and business development strategies resulted in measurable connections made and new projects for our firm.",
    name: "Jay Connolly",
    title: "President, Connolly Brothers",
    logo: "/logos/connolly-brothers.webp",
  },
  {
    quote: "The team's expertise and insight into how social capital works were so valuable for our company and had a very high return on investment.",
    name: "Kevin Finn",
    title: "CEO, Mutual Capital Analytics",
    logo: "/logos/mutual-capital-analytics.webp",
  },
  {
    quote:
      "I highly recommend The Endurance Group for their outstanding social capital campaign services. They are a reliable and trusted partner - responsive and quite proactive.",
    name: "Nikki Blacksmith",
    title: "CEO, Symeta Inc.",
  },
  {
    quote:
      "Their approach to reaching new people is very effective and efficient. If you're looking for a \"way in\" to a large group of targeted people, they'll improve your efficiency.",
    name: "Jason Benavidez",
    title: "Director of Strategic Business, The Tyson Group, Inc.",
  },
];

export function Marketing() {
  // Once the session has resolved, send signed-in users straight to their
  // workspace - first-timers to onboarding, returning users to the dashboard.
  const { ready, token, needsOnboarding, joinNotice } = useAuthStore();
  if (ready && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (ready && token && joinNotice) return <JoinNoticeScreen />;
  if (ready && token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-content items-center justify-between px-6 py-5">
        <img src="/logo.png" alt="Commonality" className="h-7 w-auto" />
        <div className="flex items-center gap-4 text-sm">
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
            Warm Introductions, Instantly
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Your next deal is already in your team's network.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/90">
            Ask your AI &ldquo;what's the best way into Acme?&rdquo; or &ldquo;find me a warm
            intro to John Smith, VP of Finance at Global Inc.&rdquo;
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
          <p className="mt-3 text-sm text-white/70">No credit card · 50 credits/mo free</p>
        </div>

        <div className="mx-auto mt-12 max-w-md animate-float">
          <ChatMock />
          <p className="mt-4 text-sm text-white/70">Ask about a person or a whole company - anytime</p>
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

        <SectionCta label="Find your way in to your top prospect now →" />
      </section>

      {/* How matching works */}
      <section className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          How we find the strongest connection
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

        <div className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
          <div className="animate-fade-up rounded-lg border border-gray-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-lavender">LinkedIn tells you</p>
            <p className="mt-3 text-sm text-ink">
              Your top prospect is a 2nd-degree connection - and that's about it.
            </p>
          </div>
          <div
            className="animate-fade-up rounded-lg bg-tint-brand p-6"
            style={{ animationDelay: "0.1s" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Commonality tells you</p>
            <p className="mt-3 text-sm font-medium text-ink">
              A coworker went to the same school, another worked at the same past company - and
              which of those shared bonds actually gets you the meeting.
            </p>
          </div>
        </div>

        <SectionCta label="See my warmest path to a prospect →" />
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">From setup to warm intro</h2>

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

      {/* Testimonials */}
      <section className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
          Trusted by teams who needed a real way in
        </h2>

        <div className="mt-10 space-y-6">
          {caseStudies.map((c) => (
            <div key={c.company} className="rounded-lg border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <img src={c.logo} alt={c.company} className="h-7 w-auto object-contain" />
                <span className="text-lg font-bold text-ink">{c.company}</span>
                {c.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-tint-accent px-3 py-1 text-xs font-medium text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-lavender">{c.story}</p>
              <p className="mt-3 text-sm font-medium text-ink">{c.result}</p>
              <blockquote className="mt-4 border-l-2 border-brand pl-4 text-sm italic text-ink">
                &ldquo;{c.quote}&rdquo;
                <footer className="mt-2 text-sm font-medium not-italic text-lavender">
                  - {c.name}, {c.title}
                </footer>
              </blockquote>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortQuotes.map((t) => (
            <div key={t.name} className="rounded-lg bg-tint-brand p-5 text-left">
              {t.logo && <img src={t.logo} alt={t.title} className="mb-3 h-6 w-auto object-contain" />}
              <p className="text-sm text-ink">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-3 text-xs font-medium text-lavender">
                {t.name} · {t.title}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <SectionCta label="Get results like these →" />
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
                50 credits/mo
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
            <div className="mt-2 text-3xl font-bold text-ink">$50/mo</div>
            <ul className="mt-4 space-y-2 text-sm text-lavender">
              <li className="flex items-center gap-2">
                <CheckIcon />
                150 team members
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                200 credits/mo
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
                Custom credits/mo
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
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-2 px-6">
          <span>© Commonality - The Endurance Group</span>
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
