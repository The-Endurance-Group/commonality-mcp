import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-brand"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const stats = [
  { value: "~2%", label: "cold email reply rate", sub: "B2B cold outreach average" },
  { value: "< 30%", label: "cold LinkedIn accept rate", sub: "even with a personalized note" },
  { value: "5–10×", label: "higher conversion on warm intros", sub: "with a genuine shared connection" },
];

const steps = [
  {
    n: 1,
    title: "Load your team once",
    body: "Enter your company name and we automatically enrich your team with schools, employers, and locations.",
  },
  {
    n: 2,
    title: "Find or drop in a prospect",
    body: "No LinkedIn URL? Just ask Claude or ChatGPT — describe who you're looking for (e.g. \"VP of Sales at mid-size fintechs\") and we'll find matching profiles. Already have a name or URL? Search or paste it directly. Either way, instantly see every teammate with a shared school, employer, hometown, or direct connection, ranked by strength.",
  },
  {
    n: 3,
    title: "Send the right message",
    body: "One click drafts a personalized outreach with Claude or ChatGPT, built around the real shared connection — ready to send.",
  },
];

const features = [
  { title: "Team network mapping", sub: "Great for account planning" },
  { title: "Instant connection matching", sub: "Works for SDRs and AEs" },
  { title: "⚡ Includes 1st-degree LinkedIn", sub: "Claude- and ChatGPT-grounded in the real connection" },
  { title: "LinkedIn + email in one click", sub: "Drafted by Claude or ChatGPT" },
  { title: "Prospect history & pipeline tracking", sub: "No more lost follow-ups" },
  { title: "CRM sync — HubSpot & Salesforce", sub: "Fits your existing workflow" },
  { title: "Invite your whole team (Pro)", sub: "Flat rate · Unlimited users" },
  { title: "Route leads to the right teammate", sub: "Analysis + intro message attached" },
  { title: "AI prospect search", sub: "Describe who you want to Claude or ChatGPT — it finds them" },
];

const testimonials = [
  {
    quote:
      "We booked 3 meetings in the first week just by finding teammates who went to the same school as our prospects. It's shockingly effective.",
    initial: "A",
    name: "Alex R.",
    role: "VP of Sales, Series B SaaS",
  },
  {
    quote:
      "Cold outreach reply rates tripled once we started leading with a real shared connection. Commonality finds those connections in seconds.",
    initial: "M",
    name: "Morgan T.",
    role: "Head of Growth, B2B SaaS",
  },
];

export function Marketing() {
  // Once the session has resolved, send signed-in users straight to their
  // workspace — first-timers to onboarding, returning users to the dashboard.
  const { ready, token, needsOnboarding } = useAuthStore();
  if (ready && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (ready && token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-content items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold text-ink">Commonality</span>
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
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          Social Selling · Warm Introductions · Relationship-Based Selling
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Your next deal is already in your team's network.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-lavender">
          Commonality maps your team's shared schools, employers, and LinkedIn connections to
          every prospect — right inside Claude or ChatGPT — so every outreach starts with a
          real reason to connect.
        </p>

        <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-lavender">
          <li className="flex gap-2">
            <CheckIcon />
            Shared schools, employers & hometowns across your whole team
          </li>
          <li className="flex gap-2">
            <CheckIcon />
            Outreach drafted by Claude or ChatGPT, grounded in the real connection
          </li>
          <li className="flex gap-2">
            <CheckIcon />
            Includes 1st-degree LinkedIn connection matching — the strongest warm path of all
          </li>
        </ul>

        <div className="mt-8 flex items-center justify-center gap-3">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                Start for free — no credit card
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
              Open your workspace
            </Link>
          </SignedIn>
          <a href="#how-it-works" className="px-6 py-3 font-medium text-brand hover:underline">
            See how it works →
          </a>
        </div>
        <p className="mt-3 text-sm text-lavender">25 team members & 10 searches free · CRM sync included</p>

        <div className="mx-auto mt-16 aspect-video max-w-2xl rounded-lg border border-dashed border-gray-300 bg-white/60 p-10 text-lavender">
          Claude / ChatGPT demo video coming soon
        </div>
      </section>

      {/* Why cold outreach is broken */}
      <section className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
          Why cold outreach is broken
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-bold text-accent">{s.value}</div>
              <div className="mt-2 font-medium text-ink">{s.label}</div>
              <div className="mt-1 text-sm text-lavender">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="mx-auto max-w-content px-6 py-16">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-accent">
          The workflow
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-ink sm:text-3xl">
          From prospect to warm outreach in 60 seconds
        </h2>
        <p className="mt-2 text-center text-lavender">
          Drop a prospect into Claude or ChatGPT, see who's connected, send.
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white font-semibold">
                {step.n}
              </div>
              <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-lavender">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                Start your free trial →
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
              Open your workspace
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-content px-6 py-16">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-accent">
          Built for sales teams
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-ink sm:text-3xl">
          Everything you need to sell on relationships.
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg bg-tint-accent p-5">
              <div className="font-medium text-ink">{f.title}</div>
              <div className="mt-1 text-sm text-lavender">{f.sub}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                Find your warm paths free →
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
              Open your workspace
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
          Trusted by sales teams
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-lg bg-tint-brand p-6">
              <p className="text-lavender">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white font-semibold">
                  {t.initial}
                </div>
                <div>
                  <div className="font-medium text-ink">{t.name}</div>
                  <div className="text-sm text-lavender">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
          Simple, team-based pricing
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-lavender">
          One price for your whole team — not a per-seat model that grows every time you add a
          rep.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="font-semibold text-ink">Free trial</div>
            <div className="mt-2 text-3xl font-bold text-ink">$0</div>
            <div className="mt-1 text-sm text-lavender">No credit card · No expiry</div>
            <ul className="mt-6 space-y-2 text-sm text-lavender">
              <li>Up to 25 team members enriched</li>
              <li>10 prospect searches to test with real targets</li>
              <li>Outreach drafted by Claude & ChatGPT</li>
              <li>Team network dashboard</li>
              <li>CRM sync (HubSpot & Salesforce)</li>
            </ul>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="mt-6 w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-ink hover:bg-gray-50">
                  Start for free
                </button>
              </SignUpButton>
            </SignedOut>
          </div>

          <div className="relative rounded-lg border-2 border-brand p-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
              Most popular
            </div>
            <div className="font-semibold text-ink">Pro</div>
            <div className="mt-2 text-3xl font-bold text-ink">$199/month</div>
            <div className="mt-1 text-sm text-lavender">Flat company rate · unlimited users</div>
            <ul className="mt-6 space-y-2 text-sm text-lavender">
              <li>Up to 150 team members enriched</li>
              <li>200 prospect searches every month</li>
              <li>Unlimited users — one flat rate for your whole team</li>
              <li>Prospect history & pipeline status tracking</li>
              <li>Team invite link & everything in Free</li>
            </ul>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="mt-6 w-full rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                  Start free, upgrade when ready
                </button>
              </SignUpButton>
            </SignedOut>
            <p className="mt-3 text-xs text-lavender">
              A team of 5 reps → ~$40/seat/month. One new meeting pays for the month.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-6">
            <div className="font-semibold text-ink">Enterprise</div>
            <div className="mt-2 text-3xl font-bold text-ink">Contact us</div>
            <div className="mt-1 text-sm text-lavender">Custom team size & search volume</div>
            <ul className="mt-6 space-y-2 text-sm text-lavender">
              <li>More than 150 team members</li>
              <li>More than 200 searches/month</li>
              <li>Everything in Pro</li>
              <li>Custom contract & invoicing</li>
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
